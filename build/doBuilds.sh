node ../../bdBuild/lib/main.js -b basic.bc.js
java -jar ../../ccompiler/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js basic/require.js --js_output_file basic-cc/require.js

node ../../bdBuild/lib/main.js -b desktop.bc.js
java -jar ../../ccompiler/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js desktop/require.js --js_output_file desktop-cc/require.js

node ../../bdBuild/lib/main.js -b mini.bc.js
java -jar ../../ccompiler/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js mini/require.js --js_output_file mini-cc/require.js

node ../../bdBuild/lib/main.js -b webkit.bc.js
java -jar ../../ccompiler/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js webkit/require.js --js_output_file webkit-cc/require.js


