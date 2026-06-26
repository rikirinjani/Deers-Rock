export default {
  name: "deers-rock",
  build: {
    command: "npm install && npm run build",
  },
  deploy: {
    command: "node dist/cli/index.js",
    port: 3000,
  },
};
