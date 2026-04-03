/**
 * JNI bridge between OnDeviceLLMModule.java and llama.cpp.
 *
 * Updated for llama.cpp b4920+ API which uses llama_vocab
 * instead of llama_model for tokenization functions.
 */

#include <jni.h>
#include <android/log.h>
#include <string>
#include <vector>
#include <cstring>

#define TAG "LlamaJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

#ifdef LLAMA_STUB_MODE
// Stub mode — llama.cpp not available. Return zeros/empty strings.
extern "C" {
JNIEXPORT jlong JNICALL Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeLoadModel(JNIEnv *env, jobject, jstring, jint, jint) { LOGW("Stub mode: nativeLoadModel"); return 0; }
JNIEXPORT void JNICALL Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeUnloadModel(JNIEnv *, jobject, jlong) {}
JNIEXPORT jstring JNICALL Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeGenerate(JNIEnv *env, jobject, jlong, jstring, jint, jfloat) { return env->NewStringUTF("{\"action\":\"unknown\",\"text\":\"llama.cpp not compiled\"}"); }
JNIEXPORT jstring JNICALL Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeGetInfo(JNIEnv *env, jobject, jlong) { return env->NewStringUTF("{\"error\":\"stub mode\"}"); }
}
#else
// Real mode — full llama.cpp inference
#include "llama.h"

// Wraps a loaded model + reusable context
struct LlamaHandle {
    llama_model   *model;
    llama_context *ctx;
    const llama_vocab *vocab;
    int n_ctx;
};

// Convert a llama_token to a string piece
static std::string token_to_piece(const llama_vocab *vocab, llama_token token) {
    char buf[256];
    int n = llama_token_to_piece(vocab, token, buf, sizeof(buf), 0, true);
    if (n < 0) {
        std::vector<char> big(static_cast<size_t>(-n));
        int n2 = llama_token_to_piece(vocab, token, big.data(), big.size(), 0, true);
        return std::string(big.data(), n2 > 0 ? n2 : 0);
    }
    return std::string(buf, n);
}

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeLoadModel(
    JNIEnv *env, jobject /*thiz*/,
    jstring jModelPath, jint nThreads, jint nCtx)
{
    const char *modelPath = env->GetStringUTFChars(jModelPath, nullptr);
    LOGI("Loading model: %s (threads=%d, ctx=%d)", modelPath, nThreads, nCtx);

    llama_model_params model_params = llama_model_default_params();
    llama_model *model = llama_model_load_from_file(modelPath, model_params);
    env->ReleaseStringUTFChars(jModelPath, modelPath);

    if (!model) {
        LOGE("Failed to load model");
        return 0;
    }

    llama_context_params ctx_params = llama_context_default_params();
    ctx_params.n_ctx           = nCtx > 0 ? nCtx : 512;
    ctx_params.n_threads       = nThreads > 0 ? nThreads : 4;
    ctx_params.n_threads_batch = nThreads > 0 ? nThreads : 4;

    llama_context *ctx = llama_init_from_model(model, ctx_params);
    if (!ctx) {
        LOGE("Failed to create context");
        llama_model_free(model);
        return 0;
    }

    const llama_vocab *vocab = llama_model_get_vocab(model);

    auto *handle = new LlamaHandle{model, ctx, vocab, static_cast<int>(ctx_params.n_ctx)};
    LOGI("Model loaded successfully, handle=%p", handle);
    return reinterpret_cast<jlong>(handle);
}

JNIEXPORT void JNICALL
Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeUnloadModel(
    JNIEnv * /*env*/, jobject /*thiz*/, jlong handlePtr)
{
    if (handlePtr == 0) return;
    auto *handle = reinterpret_cast<LlamaHandle *>(handlePtr);

    if (handle->ctx) llama_free(handle->ctx);
    if (handle->model) llama_model_free(handle->model);
    delete handle;
    LOGI("Model unloaded");
}

JNIEXPORT jstring JNICALL
Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeGenerate(
    JNIEnv *env, jobject /*thiz*/,
    jlong handlePtr, jstring jPrompt, jint maxTokens, jfloat temperature)
{
    if (handlePtr == 0) {
        return env->NewStringUTF("{\"action\":\"unknown\",\"text\":\"model not loaded\"}");
    }

    auto *handle = reinterpret_cast<LlamaHandle *>(handlePtr);
    const char *prompt = env->GetStringUTFChars(jPrompt, nullptr);
    const int prompt_len = strlen(prompt);

    // Tokenize using vocab
    const int max_prompt_tokens = handle->n_ctx - maxTokens;
    std::vector<llama_token> tokens(max_prompt_tokens);
    int n_tokens = llama_tokenize(
        handle->vocab, prompt, prompt_len,
        tokens.data(), tokens.size(),
        true,   // add_special (BOS)
        true    // parse_special
    );
    env->ReleaseStringUTFChars(jPrompt, prompt);

    if (n_tokens < 0) {
        LOGE("Tokenization failed (needed %d tokens, buffer %d)", -n_tokens, max_prompt_tokens);
        return env->NewStringUTF("{\"action\":\"unknown\",\"text\":\"prompt too long\"}");
    }
    tokens.resize(n_tokens);

    LOGI("Prompt tokenized: %d tokens, generating up to %d tokens", n_tokens, maxTokens);

    // Clear KV cache
    llama_kv_self_clear(handle->ctx);

    // Build sampler chain
    llama_sampler_chain_params chain_params = llama_sampler_chain_default_params();
    llama_sampler *sampler = llama_sampler_chain_init(chain_params);
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.9f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(temperature > 0.0f ? temperature : 0.1f));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(42));

    // Decode prompt
    llama_batch batch = llama_batch_get_one(tokens.data(), n_tokens);
    if (llama_decode(handle->ctx, batch) != 0) {
        LOGE("Prompt decode failed");
        llama_sampler_free(sampler);
        return env->NewStringUTF("{\"action\":\"unknown\",\"text\":\"decode error\"}");
    }

    // Generate tokens
    std::string result;
    for (int i = 0; i < maxTokens; i++) {
        llama_token new_token = llama_sampler_sample(sampler, handle->ctx, -1);

        if (llama_vocab_is_eog(handle->vocab, new_token)) {
            break;
        }

        std::string piece = token_to_piece(handle->vocab, new_token);
        result += piece;

        llama_batch next_batch = llama_batch_get_one(&new_token, 1);
        if (llama_decode(handle->ctx, next_batch) != 0) {
            LOGE("Decode failed at token %d", i);
            break;
        }
    }

    llama_sampler_free(sampler);
    LOGI("Generated %zu chars", result.size());
    return env->NewStringUTF(result.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_openclaw_ondevicellm_OnDeviceLLMModule_nativeGetInfo(
    JNIEnv *env, jobject /*thiz*/, jlong handlePtr)
{
    if (handlePtr == 0) {
        return env->NewStringUTF("{\"error\":\"no model loaded\"}");
    }

    auto *handle = reinterpret_cast<LlamaHandle *>(handlePtr);

    char desc[256];
    llama_model_desc(handle->model, desc, sizeof(desc));

    int n_vocab = llama_vocab_n_tokens(handle->vocab);

    char json[512];
    snprintf(json, sizeof(json),
        "{\"description\":\"%s\",\"vocab_size\":%d,\"context_size\":%d}",
        desc, n_vocab, handle->n_ctx);

    return env->NewStringUTF(json);
}

} // extern "C"

#endif // LLAMA_STUB_MODE
