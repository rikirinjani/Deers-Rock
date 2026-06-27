export default {
  name: "deers-rock",
  build: {
    command: "rm -rf dist && npm install && npm run build",
  },
  deploy: {
    command: "node dist/cli/index.js up",
    port: 8080,
  },
};
