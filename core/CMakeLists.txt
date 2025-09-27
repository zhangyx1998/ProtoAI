# =============================================================================
# Build Recipe For Node.js Addon Module
# =============================================================================
# License: MIT
# Author: Yuxuan Zhang (zhangyuxuan@ufl.edu)
# =============================================================================
cmake_minimum_required(VERSION 3.10)
project(addon)
set(PROJECT_HOME ${CMAKE_CURRENT_SOURCE_DIR})
list(APPEND CMAKE_MODULE_PATH ${PROJECT_HOME}/scripts)

# CMake Parameters and Variables
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
set(INC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/include)
# Get all the cpp files in the src directory
file(GLOB SRCS ${SRC_DIR}/*.cpp ${SRC_DIR}/**/*.cpp)

set(CMAKE_BUILD_TYPE Debug)
set(CMAKE_MODULE_PATH ${PROJECT_HOME}/scripts)

set(PROJECT_HOME ${CMAKE_CURRENT_SOURCE_DIR})
set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)

# set(CMAKE_CXX_FLAGS "-Wall -Wno-ignored-qualifiers")
set(CMAKE_CXX_FLAGS_DEBUG "-g -DDEBUG")
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

# Dependencies
find_package(NodeApiHeaders REQUIRED)
find_package(NodeAddonApi REQUIRED)
find_package(OpenCV REQUIRED)
# header files and libraries
include_directories(
  ${INC_DIR}      # project local include directory
  ${PROJECT_HOME}/lib/
  ${PROJECT_HOME}/assets/
  ${CMAKE_JS_INC}
  ${NodeApiHeaders_INCLUDE_DIRS}
  ${NodeAddonApi_INCLUDE_DIRS}
)

# Library linkables
link_directories()

# Project Local Library
file(GLOB LIB_SRCS ${PROJECT_HOME}/lib/**/*.cpp)

# Get all the generates assets
file(GLOB ASSETS ${PROJECT_HOME}/assets/*.o)

SET_SOURCE_FILES_PROPERTIES(
  ${ASSETS}
  PROPERTIES
  EXTERNAL_OBJECT true
  GENERATED true
)

# Link with libraries
link_libraries()

# Build Targets
add_library(${PROJECT_NAME} SHARED
  addon.cpp
  ${SRCS}
  ${LIB_SRCS}
)

add_definitions(${CXX_FLAGS})


set_target_properties(${PROJECT_NAME} PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  BUILD_RPATH "@loader_path;/usr/local/lib"
  INSTALL_RPATH "@loader_path;/usr/local/lib"
  INSTALL_NAME_DIR "@rpath"
)

if (APPLE)
  set_target_properties(${PROJECT_NAME} PROPERTIES
    MACOSX_RPATH ON
    INSTALL_NAME_DIR "@rpath"
  )
endif()

target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
