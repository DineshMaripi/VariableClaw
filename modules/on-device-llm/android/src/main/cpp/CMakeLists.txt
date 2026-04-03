cmake_minimum_required(VERSION 3.22.1)
project(llama-android C CXX)

set(CMAKE_CXX_STANDARD 17)

# Path to llama.cpp source — try multiple locations
# Location 1: project root /llama.cpp (EAS Build with prebuild command)
# Location 2: modules/on-device-llm/llama.cpp (local dev)
set(LLAMA_CPP_DIR_1 "${CMAKE_SOURCE_DIR}/../../../../../llama.cpp")
set(LLAMA_CPP_DIR_2 "${CMAKE_SOURCE_DIR}/../../../../../modules/on-device-llm/llama.cpp")

if(EXISTS "${LLAMA_CPP_DIR_1}/CMakeLists.txt")
    set(LLAMA_CPP_DIR "${LLAMA_CPP_DIR_1}")
    message(STATUS "Found llama.cpp at project root")
elseif(EXISTS "${LLAMA_CPP_DIR_2}/CMakeLists.txt")
    set(LLAMA_CPP_DIR "${LLAMA_CPP_DIR_2}")
    message(STATUS "Found llama.cpp in modules/on-device-llm/")
else()
    message(WARNING
        "llama.cpp source not found. Native LLM inference will not be available.\n"
        "Run: npm run setup:llama  (or bash scripts/setup-llama.sh)\n"
        "The app will fall back to mock mode for AI inference.")
    # Create a stub library so the build doesn't fail
    add_library(llama-android SHARED llama_jni.cpp)
    target_link_libraries(llama-android log android)
    # Define a flag so JNI code can detect stub mode
    target_compile_definitions(llama-android PRIVATE LLAMA_STUB_MODE=1)
    return()
endif()

# Disable unused llama.cpp features to speed up compilation
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_CURL OFF CACHE BOOL "" FORCE)

# Build llama.cpp as a static library
add_subdirectory(${LLAMA_CPP_DIR} llama.cpp.build)

# Our JNI bridge library
add_library(llama-android SHARED llama_jni.cpp)

target_include_directories(llama-android PRIVATE
    ${LLAMA_CPP_DIR}/include
)

# In newer llama.cpp (b4920+), 'common' is a static lib built inside llama.
# Link only what exists. llama already includes everything needed.
target_link_libraries(llama-android
    llama
    log
    android
)
