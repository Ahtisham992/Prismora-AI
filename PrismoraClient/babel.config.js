module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',      // how you will import
      path: '.env',            // path to your env file
      safe: false,             // set true if you want .env.example validation
      allowUndefined: true,    // allow undefined variables
    }]
  ]
};
