"""
Unit tests for FastAPI simulator endpoints (app.py).
"""

import unittest
from fastapi.testclient import TestClient
from app import app


class TestSimulatorAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")

    def test_simulate_endpoint(self):
        payload = {
            "algorithm": "AdaptiveHybrid",
            "workload_type": "Zipf (Hot/Cold)",
            "frame_count": 8,
            "references": 200,
            "write_probability": 0.2,
            "seed": 42,
        }
        resp = self.client.post("/api/simulate", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check metrics
        self.assertIn("metrics", data)
        metrics = data["metrics"]
        self.assertEqual(metrics["total_accesses"], 200)
        self.assertTrue(0.0 <= metrics["hit_ratio"] <= 1.0)
        self.assertTrue(metrics["eat"] > 0)

        # Check memory manager state
        self.assertIn("memory_manager", data)
        mm = data["memory_manager"]
        self.assertEqual(mm["frame_count"], 8)
        self.assertEqual(len(mm["frames"]), 8)

        # Check frame fields
        first_frame = mm["frames"][0]
        self.assertIn("frame_id", first_frame)
        self.assertIn("dirty", first_frame)
        self.assertIn("page_number", first_frame)
        self.assertIn("hybrid_score", first_frame)

    def test_benchmark_endpoint(self):
        resp = self.client.get("/api/benchmark?references=80&frames=4&seed=42")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("raw_results", data)
        self.assertIn("chart_data", data)
        self.assertEqual(len(data["raw_results"]), 16)  # 4 workloads * 4 algorithms
        self.assertEqual(len(data["chart_data"]), 4)    # 4 workloads


if __name__ == "__main__":
    unittest.main()
