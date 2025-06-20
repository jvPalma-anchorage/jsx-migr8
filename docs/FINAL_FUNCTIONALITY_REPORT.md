# jsx-migr8 Final Functionality Test Report

## Executive Summary

- **Overall Functionality Score**: 1/10
- **Core Functionality Score**: 0/10
- **Total Tests**: 10
- **Passed**: 1
- **Failed**: 9
- **Success Rate**: 10.0%

## Test Results


### 1. Graph Building and Analysis
- **Status**: ❌ FAILED
- **Duration**: 3594ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && yarn start --root "/data/data/com.termux/files/home/jsx-migr8/test-react-project" --info --quiet

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




### 2. Component Discovery and Inspection
- **Status**: ❌ FAILED
- **Duration**: 3678ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && timeout 10 yarn start --root "/data/data/com.termux/files/home/jsx-migr8/test-react-project" --quiet

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




### 3. Rule Generation and Validation
- **Status**: ❌ FAILED
- **Duration**: 68ms
- **Error**: Invalid rule structure in /data/data/com.termux/files/home/jsx-migr8/migr8Rules/test-ui-migration-migr8.json



### 4. Dry-run Migration with Diffs
- **Status**: ❌ FAILED
- **Duration**: 4828ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && timeout 10 yarn dry-run --root "/data/data/com.termux/files/home/jsx-migr8/test-react-project" --quiet

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




### 5. Backup System Functionality
- **Status**: ❌ FAILED
- **Duration**: 3578ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && yarn start --listBackups --quiet

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




### 6. YOLO Migration Application
- **Status**: ❌ FAILED
- **Duration**: 4863ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && timeout 5 yarn yolo --root "/data/data/com.termux/files/home/jsx-migr8/test-react-project" --quiet

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




### 7. Performance Optimizations
- **Status**: ❌ FAILED
- **Duration**: 3361ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && timeout 10 yarn start --root "/data/data/com.termux/files/home/jsx-migr8/test-react-project" --optimized --info --quiet

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




### 8. Memory Management
- **Status**: ❌ FAILED
- **Duration**: 3481ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && timeout 10 yarn start --root "/data/data/com.termux/files/home/jsx-migr8/test-react-project" --maxMemory 512 --enableMemoryMonitoring --quiet

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




### 9. Error Handling and Recovery
- **Status**: ✅ PASSED
- **Duration**: 3386ms

- **Details**: {
  "errorHandlingWorking": true,
  "handledInvalidPath": true
}


### 10. CLI Workflow Integration
- **Status**: ❌ FAILED
- **Duration**: 3302ms
- **Error**: Command failed: cd /data/data/com.termux/files/home/jsx-migr8 && yarn start --help

node:internal/modules/run_main:105
    triggerUncaughtException(
    ^
Error [TransformError]: Transform failed with 1 error:
/data/data/com.termux/files/home/jsx-migr8/src/graph/buildGraph.ts:99:8: ERROR: The symbol "safeBlacklist" has already been declared
    at failureErrorWithLog (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:1463:15)
    at /data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:734:50
    at responseCallbacks.<computed> (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:601:9)
    at handleIncomingPacket (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:656:12)
    at Socket.readFromStdout (/data/data/com.termux/files/home/jsx-migr8/node_modules/tsx/node_modules/esbuild/lib/main.js:579:7)
    at Socket.emit (node:events:507:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

Node.js v24.2.0




## Performance Analysis

- **Total Execution Time**: 34139ms
- **Average Test Duration**: 3413.9ms
- **Fastest Test**: 68ms
- **Slowest Test**: 4863ms

## Recommendations


### ⚠️ NEEDS IMPROVEMENT
jsx-migr8 requires significant improvements before production:
- Address all failed critical tests
- Review error handling and recovery
- Improve reliability and performance
- Comprehensive testing and debugging needed


## Generated on
2025-06-20T10:59:21.740Z

## Test Environment
- Node.js: v24.2.0
- Platform: android
- Working Directory: /data/data/com.termux/files/home/jsx-migr8
