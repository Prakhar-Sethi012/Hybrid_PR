"""
FastAPI Backend for Discrete-Event OS Simulator.
Exposes SimulationEngine, MemoryManager, and Benchmark suite over REST API.

Endpoints:
- POST /api/simulate: Runs a single memory trace simulation and returns metrics & RAM frame states.
- GET  /api/benchmark: Runs full 4x4 comparative benchmark matrix across workloads and algorithms.
- GET  /api/health: Health check endpoint.
"""

from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.memory import MemoryManager
from src.process import Process
from src.workload import WorkloadGenerator
from src.engine import (
    SimulationEngine,
    PageReplacementPolicy,
    RAM_ACCESS_TIME_NS,
    DISK_READ_TIME_NS,
    DISK_WRITE_TIME_NS,
)
from src.evaluate import (
    run_benchmark as evaluate_run_benchmark,
    BENCHMARK_WORKLOADS,
    BENCHMARK_ALGORITHMS,
)

app = FastAPI(
    title="OS Memory Simulator API",
    description="Backend API for Adaptive Hybrid Page Replacement Simulator and Benchmarks",
    version="1.0.0",
)

# Enable CORS for React frontend (Vite default port 5173, plus wildcard for local development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulateRequest(BaseModel):
    """Payload schema for POST /api/simulate."""
    algorithm: str = Field(
        default=PageReplacementPolicy.ADAPTIVE_HYBRID,
        description="Page replacement policy: 'AdaptiveHybrid', 'FIFO', 'LRU', or 'LFU'",
    )
    workload_type: str = Field(
        default="Zipf (Hot/Cold)",
        description="Workload pattern: 'Sequential', 'Loop', 'Random', or 'Zipf (Hot/Cold)'",
    )
    frame_count: int = Field(default=10, ge=1, le=128, description="Number of physical memory frames")
    references: int = Field(default=1000, ge=1, le=50000, description="Total memory accesses to generate")
    write_probability: float = Field(default=0.2, ge=0.0, le=1.0, description="Write probability (0.0 - 1.0)")
    page_count: Optional[int] = Field(default=30, ge=2, le=500, description="Virtual page range size")
    seed: Optional[int] = Field(default=42, description="Pseudo-random seed for reproducible workload")
    window_size: Optional[int] = Field(default=100, ge=10, le=5000, description="Tuning/thrashing window size N")
    upper_fault_threshold: Optional[float] = Field(default=0.20, ge=0.0, le=1.0)
    suspension_duration: Optional[int] = Field(default=2, ge=1, le=20)


def _generate_trace_for_workload(
    workload_type: str,
    references: int,
    page_count: int,
    write_prob: float,
    seed: Optional[int],
) -> List[tuple]:
    """Generates trace according to the requested workload type."""
    gen = WorkloadGenerator(
        number_of_references=references,
        seed=seed,
        write_probability=write_prob,
        include_writes=True,
    )

    w_clean = workload_type.strip().lower().replace(" ", "").replace("_", "").replace("-", "")

    if "seq" in w_clean:
        return gen.generate_sequential(
            start=0,
            end=page_count - 1,
            num_references=references,
            include_writes=True,
            write_probability=write_prob,
        )
    elif "loop" in w_clean:
        # Loop sequence with 15 pages (or half the page_count)
        seq_len = min(15, max(3, page_count // 2))
        return gen.generate_loop(
            sequence=list(range(seq_len)),
            num_references=references,
            include_writes=True,
            write_probability=write_prob,
        )
    elif "rand" in w_clean:
        return gen.generate_random(
            page_range=page_count,
            num_references=references,
            include_writes=True,
            write_probability=write_prob,
        )
    elif "zipf" in w_clean or "hot" in w_clean:
        return gen.generate_zipf_hot_cold(
            page_range=page_count,
            hot_page_ratio=0.2,
            hot_request_ratio=0.8,
            num_references=references,
            include_writes=True,
            write_probability=write_prob,
        )
    else:
        # Default fallback to Zipf
        return gen.generate_zipf_hot_cold(
            page_range=page_count,
            hot_page_ratio=0.2,
            hot_request_ratio=0.8,
            num_references=references,
            include_writes=True,
            write_probability=write_prob,
        )


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "OS Memory Simulator API"}


@app.post("/api/simulate")
def simulate(req: SimulateRequest) -> Dict[str, Any]:
    """
    Executes a single simulation run with the given configuration.
    Returns:
    - PerformanceMetrics (hit ratio, fault ratio, EAT, faults, dirty write-backs, suspensions)
    - Final state of MemoryManager (frame-by-frame status: occupied, page number, dirty bit, score)
    - Simulation trace summary
    """
    try:
        # 1. Generate memory access trace
        trace = _generate_trace_for_workload(
            workload_type=req.workload_type,
            references=req.references,
            page_count=req.page_count or 30,
            write_prob=req.write_probability,
            seed=req.seed,
        )

        # 2. Instantiate simulator components without duplicating core logic
        mem = MemoryManager(frame_count=req.frame_count)
        proc = Process(process_id=1, name=f"Process-{req.algorithm}")
        engine = SimulationEngine(
            memory_manager=mem,
            processes=[proc],
            window_size=req.window_size or 100,
            upper_fault_threshold=req.upper_fault_threshold or 0.20,
            suspension_duration=req.suspension_duration or 2,
            policy=req.algorithm,
        )

        # 3. Execute the trace
        access_results = engine.execute_trace(proc, trace)

        # 4. Serialize physical memory frames state
        frames_state = []
        for i in range(mem.frame_count):
            frame = mem.get_frame(i)
            frames_state.append({
                "frame_id": frame.frame_id,
                "is_occupied": frame.is_occupied,
                "is_free": frame.is_free,
                "page_number": frame.page_number,
                "process_id": frame.process_id,
                "dirty": frame.dirty_bit,
                "hybrid_score": round(frame.hybrid_score, 4),
                "access_count": frame.access_count,
                "last_referenced_time": frame.last_referenced_time,
                "load_time": frame.load_time,
                "reference_bit": frame.reference_bit,
            })

        # 5. Extract metrics
        metrics = engine.metrics
        eat_ns = metrics.calculate_eat()

        # Count writes in trace
        writes_in_trace = sum(1 for item in trace if (isinstance(item, tuple) and len(item) == 2 and item[1]))

        # Recent accesses sample (last 20 for live visualizer feed)
        recent_log = []
        for res in access_results[-20:]:
            recent_log.append({
                "page_number": res.page_number,
                "is_hit": res.is_hit,
                "is_write": res.is_write,
                "frame_id": res.frame_id,
                "evicted_page": res.evicted_page,
                "was_dirty_write_back": res.was_dirty_write_back,
                "timestamp": res.timestamp,
            })

        return {
            "config": {
                "algorithm": req.algorithm,
                "workload_type": req.workload_type,
                "frame_count": req.frame_count,
                "references": req.references,
                "write_probability": req.write_probability,
                "seed": req.seed,
            },
            "metrics": {
                "total_accesses": metrics.total_accesses,
                "page_hits": metrics.page_hits,
                "page_faults": metrics.page_faults,
                "dirty_write_backs": metrics.dirty_write_backs,
                "thrashing_suspensions": metrics.thrashing_suspensions,
                "hit_ratio": metrics.hit_ratio,
                "fault_ratio": metrics.fault_ratio,
                "eat": eat_ns,
                "eat_formatted": f"{eat_ns:,.2f} ns",
            },
            "memory_manager": {
                "frame_count": mem.frame_count,
                "occupied_count": mem.occupied_frame_count,
                "free_count": mem.free_frame_count,
                "frames": frames_state,
            },
            "trace_summary": {
                "total_references": len(trace),
                "writes_count": writes_in_trace,
                "reads_count": len(trace) - writes_in_trace,
                "recent_accesses": recent_log,
            },
            "latencies": {
                "ram_access_ns": RAM_ACCESS_TIME_NS,
                "disk_read_ns": DISK_READ_TIME_NS,
                "disk_write_ns": DISK_WRITE_TIME_NS,
            },
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(exc)}")


@app.get("/api/benchmark")
def get_benchmark(
    seed: int = Query(default=42, description="Pseudo-random seed for workload generator"),
    references: int = Query(default=1000, ge=50, le=10000, description="References per workload trace"),
    frames: int = Query(default=10, ge=2, le=64, description="Physical memory frames"),
    write_prob: float = Query(default=0.2, ge=0.0, le=1.0, description="Write probability"),
) -> Dict[str, Any]:
    """
    Triggers run_benchmark() logic from evaluate.py.
    Returns comparative data (FIFO vs LRU vs LFU vs AdaptiveHybrid) across all 4 workloads
    formatted as JSON for frontend charting.
    """
    try:
        results = evaluate_run_benchmark(
            seed=seed,
            num_references=references,
            frame_count=frames,
            write_probability=write_prob,
            print_table=False,
        )

        # Structure data grouped by workload and grouped by algorithm for easy Recharts consumption
        workload_comparison: Dict[str, Dict[str, Any]] = {}
        for row in results:
            w_name = row["workload"]
            algo = row["algorithm"]
            if w_name not in workload_comparison:
                workload_comparison[w_name] = {"workload": w_name}
            workload_comparison[w_name][f"{algo}_eat"] = row["eat"]
            workload_comparison[w_name][f"{algo}_hit_ratio"] = round(row["hit_ratio"] * 100, 2)
            workload_comparison[w_name][f"{algo}_faults"] = row["page_faults"]
            workload_comparison[w_name][f"{algo}_dirty_writes"] = row["dirty_write_backs"]

        return {
            "raw_results": results,
            "chart_data": list(workload_comparison.values()),
            "workloads": BENCHMARK_WORKLOADS,
            "algorithms": BENCHMARK_ALGORITHMS,
            "meta": {
                "seed": seed,
                "references": references,
                "frames": frames,
                "write_probability": write_prob,
            },
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Benchmark error: {str(exc)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
