const packageJson = require('./package.json');

module.exports = ({ config }) => {
  return {
    ...config, // On récupère tout ce qu'il y a dans votre app.json
    version: packageJson.version, // On écrase la version avec celle du package.json
  };
};