export const config = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  judgeProvider: process.env.JUDGE_PROVIDER || "mock",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://127.0.0.1:3000",
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
