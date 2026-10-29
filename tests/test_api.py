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

        # Check execution trace
        self.assertIn("execution_trace", data)
        self.assertEqual(len(data["execution_trace"]), 200)
        first_step = data["execution_trace"][0]
        self.assertIn("action", first_step)
        self.assertIn("decision_log", first_step)
        self.assertIn("memory_state", first_step)
        self.assertEqual(len(first_step["memory_state"]), 8)

    def test_compare_endpoint(self):
        payload = {
            "workload_type": "Loop",
            "frame_count": 4,
            "references": 50,
            "write_probability": 0.2,
            "seed": 42,
        }
        resp = self.client.post("/api/compare", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("comparison", data)
        comparison = data["comparison"]
        self.assertIn("AdaptiveHybrid", comparison)
        self.assertIn("FIFO", comparison)
        self.assertIn("LRU", comparison)
        self.assertIn("LFU", comparison)

        for algo in ["AdaptiveHybrid", "FIFO", "LRU", "LFU"]:
            self.assertEqual(len(comparison[algo]["execution_trace"]), 50)
            self.assertIn("eat", comparison[algo]["metrics"])

    def test_custom_reference_string_simulate(self):
        custom_seq = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
        payload = {
            "algorithm": "AdaptiveHybrid",
            "frame_count": 3,
            "references": len(custom_seq),
            "write_probability": 0.5,
            "seed": 42,
            "custom_reference_string": custom_seq,
        }
        resp = self.client.post("/api/simulate", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["reference_string"], custom_seq)
        self.assertEqual(data["metrics"]["total_accesses"], len(custom_seq))
        self.assertEqual(len(data["execution_trace"]), len(custom_seq))

        # Check that steps with eviction have cp_breakdown with parsed math
        evictions = [s for s in data["execution_trace"] if s["evicted_page"] is not None]
        self.assertTrue(len(evictions) > 0)
        first_eviction = evictions[0]
        self.assertIsNotNone(first_eviction["cp_breakdown"])
        cp = first_eviction["cp_breakdown"]
        self.assertIn("score", cp)
        self.assertIn("dirty_penalty", cp)
        self.assertIn("total_cost", cp)
        self.assertIn("lambda", cp)

    def test_custom_reference_string_compare(self):
        custom_seq = [1, 2, 3, 1, 4, 2, 5, 1]
        payload = {
            "frame_count": 3,
            "references": len(custom_seq),
            "write_probability": 0.2,
            "seed": 42,
            "custom_reference_string": custom_seq,
        }
        resp = self.client.post("/api/compare", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        comparison = data["comparison"]
        for algo in ["AdaptiveHybrid", "FIFO", "LRU", "LFU"]:
            self.assertEqual(len(comparison[algo]["execution_trace"]), len(custom_seq))

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
