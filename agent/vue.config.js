var webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    configureWebpack: config => {
        // Configuration applied to all builds
        return {
            plugins: [
                new CopyPlugin([
                    {from: 'protobufjs/**/*.proto', to: 'node_modules/'},
                    {from: 'protobufjs/package.json', to: 'node_modules/protobufjs'},
                ], {context: 'node_modules/'}),
                new CopyPlugin([
                    {from: 'protos/**/*.proto', to: 'src/'},
                ], {context: 'node_modules/@google-cloud/firestore/build/'}),


            ]
        }
    },
    pluginOptions: {
        electronBuilder: {

            builderOptions: {
                asar: false,
                extraFiles: [
                    {
                        "from": "./dist_electron/bundled/node_modules/protobufjs",
                        "to": "resources/app/node_modules/protobufjs",
                    },
                ],
                mac: {
                    icon: './src/assets/icons/mac/icon.icns',
                },
                win: {
                    icon: './src/assets/icons/win/icon.ico',
                },
                linux: {
                    icon: './src/assets/icons/png/512x512.png'
                }
            },
            chainWebpackMainProcess: config => {
                //Fix firebase log message
                config.resolve.mainFields.delete('main').prepend('main');
                config.plugin('modules').use(webpack.NormalModuleReplacementPlugin, [
                    /@grpc\/proto-loader/,
                    function (resource) {
                        resource.request = resource.request.replace(
                            /@grpc\/proto-loader/,
                            `webpack-proto-loader`
                        )
                    }
                ]);

                //
                // // Chain webpack config for electron main process only
                // const prefixRE = /^VUE_APP_/;
                // const resolveClientEnv = () => {
                //     const env = {};
                //     Object.keys(process.env).forEach(key => {
                //         if (prefixRE.test(key) || key === 'NODE_ENV') {
                //             env[key] = process.env[key]
                //         }
                //     });
                //     for (const key in env) {
                //         env[key] = JSON.stringify(env[key])
                //     }
                //     return {
                //         'process.env': env
                //     }
                // };
                // config.plugin('define').use(require('webpack/lib/DefinePlugin'), [
                //     resolveClientEnv()
                // ]);
                return config
            },
            chainWebpackRendererProcess: config => {
                // Chain webpack config for electron renderer process only
                // The following example will set IS_ELECTRON to true in your app
                // config.plugin('define').tap(args => {
                //     args[0]['IS_ELECTRON'] = true
                //     return args
                // })
            },
            //disableMainProcessTypescript: false, // Manually disable typescript plugin for main process. Enable if you want to use regular js for the main process (src/background.js by default).
            //mainProcessTypeChecking: false // Manually enable type checking during webpck bundling for background file.
        }
    }
};
