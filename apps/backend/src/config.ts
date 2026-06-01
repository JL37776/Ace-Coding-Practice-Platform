export const config = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  judgeProvider: process.env.JUDGE_PROVIDER || "mock",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://127.0.0.1:3000",
  mysql: {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || "ace_coding",
    user: process.env.MYSQL_USER || "ace_coding",
    password: process.env.MYSQL_PASSWORD || ""
  },
  docker: {
    images: {
      python: process.env.DOCKER_JUDGE_IMAGE_PYTHON || "ace-judge-python:3.12",
      javascript: process.env.DOCKER_JUDGE_IMAGE_JAVASCRIPT || "ace-judge-javascript:22"
    },
    cpuLimit: process.env.DOCKER_JUDGE_CPUS || "0.5",
    memoryLimit: process.env.DOCKER_JUDGE_MEMORY || "256m",
    timeoutMs: Number(process.env.DOCKER_JUDGE_TIMEOUT_MS || 10000)
  },
  azure: {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || "",
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || "",
    location: process.env.AZURE_LOCATION || "australiaeast",
    jobs: {
      python: process.env.AZURE_CONTAINER_APP_JOB_PYTHON || "",
      javascript: process.env.AZURE_CONTAINER_APP_JOB_JAVASCRIPT || ""
    }
  }
};
