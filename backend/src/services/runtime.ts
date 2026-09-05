import type { PrometheusHealth, RuntimeHealth } from "../types/index.js"

export function getRuntimeHealth(scenario: "success" | "failure" = "success"): RuntimeHealth {
  if (scenario === "failure") {
    return {
      status: "unhealthy",
      cluster: "demo-cluster",
      deployments: [
        {
          name: "payment-service",
          desiredReplicas: 3,
          readyReplicas: 1,
          restarts: 8,
          cpu: 88,
          memory: 98,
          oomKilled: true,
          crashLoopBackOff: true,
        },
      ],
    }
  }

  return {
    status: "healthy",
    cluster: "demo-cluster",
    deployments: [
      {
        name: "payment-service",
        desiredReplicas: 3,
        readyReplicas: 3,
        restarts: 0,
        cpu: 42,
        memory: 61,
        oomKilled: false,
        crashLoopBackOff: false,
      },
    ],
  }
}

export function getPrometheusHealth(scenario: "success" | "failure" = "success"): PrometheusHealth {
  if (scenario === "failure") {
    return {
      status: "unhealthy",
      metrics: {
        requestCount: 1260,
        errorRate: 8.4,
        p95LatencyMs: 1240,
        cpuUsage: 88,
        memoryUsage: 98,
        podRestarts: 8,
      },
    }
  }

  return {
    status: "healthy",
    metrics: {
      requestCount: 1240,
      errorRate: 0.7,
      p95LatencyMs: 310,
      cpuUsage: 54,
      memoryUsage: 61,
      podRestarts: 0,
    },
  }
}
