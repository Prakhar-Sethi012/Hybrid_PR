"""
Codebase Snippet Image Generator for Presentation Slides.
Renders sleek, dark-mode/AMOLED macOS-style window cards with syntax highlighting.
"""

import os
from PIL import Image, ImageDraw, ImageFont
from pygments.lexers import PythonLexer
from pygments import lex
from pygments.token import Token

FONT_PATH = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', 'consola.ttf')

# AMOLED Theme Color Palette
PALETTE = {
    'bg': (9, 9, 11, 255),               # #09090B Pitch AMOLED
    'window_bg': (18, 18, 22, 255),      # #121216 Window Canvas
    'window_border': (39, 39, 42, 255),  # #27272A Subtle Border
    'title_bg': (24, 24, 28, 255),       # #18181C Window Title Bar
    'title_text': (161, 161, 170, 255),  # #A1A1AA Mono Title
    'badge_bg': (39, 39, 42, 255),       # #27272A Badge background
    'badge_text': (16, 185, 129, 255),   # #10B981 Soft Emerald
    'line_num': (82, 82, 91, 255),       # #52525B Line Numbers
    'line_div': (39, 39, 42, 255),       # Line Divider
    # Syntax Tokens
    Token.Keyword: (192, 132, 252, 255),       # #C084FC Purple
    Token.Keyword.Constant: (244, 63, 94, 255),# #F43F5E Rose
    Token.Name.Function: (96, 165, 250, 255),  # #60A5FA Soft Blue
    Token.Name.Class: (56, 189, 248, 255),     # #38BDF8 Sky Blue
    Token.Name.Builtin: (56, 189, 248, 255),   # Sky
    Token.String: (52, 211, 153, 255),         # #34D399 Emerald
    Token.String.Doc: (113, 113, 122, 255),    # #71717A Muted Slate
    Token.Number: (251, 191, 36, 255),         # #FBBF24 Amber
    Token.Comment: (113, 113, 122, 255),       # #71717A Muted Slate
    Token.Operator: (244, 63, 94, 255),        # #F43F5E Rose
    Token.Punctuation: (212, 212, 216, 255),   # #D4D4D8 Light Gray
    Token.Text: (244, 244, 245, 255),          # #F4F4F5 Pure White/Zinc
    Token.Name: (228, 228, 231, 255),          # #E4E4E7 Off-White
}

def get_token_color(token_type):
    while token_type:
        if token_type in PALETTE:
            return PALETTE[token_type]
        token_type = token_type.parent
    return PALETTE[Token.Text]

def render_code_card(
    code_text: str,
    title: str,
    badge: str,
    output_filename: str,
    font_size: int = 18,
    scale: int = 2
):
    """
    Renders high-resolution macOS-style window card for a code snippet.
    """
    code_lines = code_text.strip().split('\n')
    num_lines = len(code_lines)

    # Base dimensions (unscaled)
    char_w = 11
    line_h = 28
    pad_x = 36
    pad_y = 36
    header_h = 44
    line_num_w = 54

    max_line_len = max(len(l) for l in code_lines) if code_lines else 60
    content_w = line_num_w + (max_line_len * char_w) + 40
    card_w = max(800, content_w + (pad_x * 2))
    card_h = header_h + (num_lines * line_h) + (pad_y * 2)

    total_w = card_w + 80
    total_h = card_h + 80

    # High-DPI supersampling
    sw = total_w * scale
    sh = total_h * scale
    img = Image.new('RGBA', (sw, sh), PALETTE['bg'])
    draw = ImageDraw.Draw(img)

    # Fonts
    font = ImageFont.truetype(FONT_PATH, font_size * scale)
    title_font = ImageFont.truetype(FONT_PATH, int(font_size * 0.85) * scale)
    badge_font = ImageFont.truetype(FONT_PATH, int(font_size * 0.75) * scale)

    # Card coordinates
    cx1 = 40 * scale
    cy1 = 40 * scale
    cx2 = (40 + card_w) * scale
    cy2 = (40 + card_h) * scale
    radius = 12 * scale

    # Card background & border
    draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=radius, fill=PALETTE['window_bg'], outline=PALETTE['window_border'], width=2 * scale)

    # Header bar
    h_bottom = cy1 + (header_h * scale)
    draw.rounded_rectangle([cx1, cy1, cx2, h_bottom], radius=radius, fill=PALETTE['title_bg'])
    draw.rectangle([cx1, h_bottom - (radius), cx2, h_bottom], fill=PALETTE['title_bg'])
    draw.line([cx1, h_bottom, cx2, h_bottom], fill=PALETTE['window_border'], width=1 * scale)

    # Window Control Dots (macOS style)
    dot_y = cy1 + int(header_h * scale / 2)
    dot_r = 6 * scale
    dot_x0 = cx1 + (20 * scale)
    dot_spacing = 18 * scale

    dots = [
        (239, 68, 68, 255),   # Red
        (245, 158, 11, 255),  # Yellow
        (16, 185, 129, 255),  # Green
    ]
    for i, color in enumerate(dots):
        x = dot_x0 + (i * dot_spacing)
        draw.ellipse([x - dot_r, dot_y - dot_r, x + dot_r, dot_y + dot_r], fill=color)

    # Title in header
    title_x = dot_x0 + (len(dots) * dot_spacing) + (16 * scale)
    draw.text((title_x, dot_y - (10 * scale)), title, fill=PALETTE['title_text'], font=title_font)

    # Badge in header (right side)
    if badge:
        bbox = draw.textbbox((0, 0), badge, font=badge_font)
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        bx2 = cx2 - (20 * scale)
        bx1 = bx2 - bw - (16 * scale)
        by1 = dot_y - int(bh / 2) - (4 * scale)
        by2 = dot_y + int(bh / 2) + (4 * scale)
        draw.rounded_rectangle([bx1, by1, bx2, by2], radius=4 * scale, fill=PALETTE['badge_bg'])
        draw.text((bx1 + (8 * scale), by1 + (2 * scale)), badge, fill=PALETTE['badge_text'], font=badge_font)

    # Code Rendering
    code_start_x = cx1 + (pad_x * scale) + (line_num_w * scale)
    code_start_y = h_bottom + (20 * scale)

    # Line number separator
    div_x = code_start_x - (16 * scale)
    draw.line([div_x, h_bottom, div_x, cy2 - (10 * scale)], fill=PALETTE['line_div'], width=1 * scale)

    lexer = PythonLexer()
    tokens = list(lex(code_text, lexer))

    current_line = 1
    curr_x = code_start_x
    curr_y = code_start_y

    # Draw first line number
    draw.text((cx1 + (16 * scale), curr_y), f"{current_line:2d}", fill=PALETTE['line_num'], font=font)

    for token_type, val in tokens:
        color = get_token_color(token_type)
        parts = val.split('\n')
        for idx, part in enumerate(parts):
            if idx > 0:
                # New line
                current_line += 1
                curr_x = code_start_x
                curr_y += (line_h * scale)
                if current_line <= num_lines:
                    draw.text((cx1 + (16 * scale), curr_y), f"{current_line:2d}", fill=PALETTE['line_num'], font=font)
            if part:
                draw.text((curr_x, curr_y), part, fill=color, font=font)
                bbox = draw.textbbox((curr_x, curr_y), part, font=font)
                curr_x += (bbox[2] - bbox[0])

    os.makedirs('project_assets', exist_ok=True)
    out_path = os.path.join('project_assets', output_filename)
    img.save(out_path, format='PNG', optimize=True)
    print(f"Created {out_path} ({sw}x{sh})")


def generate_all_snippets():
    # Snippet 1: The Core Math
    code1 = '''def _select_victim_hybrid(self) -> int:
    """
    Adaptive Hybrid Page Replacement victim selection.
    Calculates each candidate's decayed hybrid score:
        S(p) = S_old * (1/2)^(lambda * Delta t)
    and total eviction cost:
        C(p) = S(p) + [delta if dirty else 0.0]
    Evicts the physical frame with the minimum cost C(p).
    """
    if not self.memory_manager.occupied_frames:
        raise RuntimeError("No memory frames occupied.")
    current_time = self.clock.current_time()
    candidates = []

    for frame_id in self.memory_manager.occupied_frames:
        frame = self.memory_manager.get_frame(frame_id)

        # Elapsed time since last memory reference
        delta_t = max(0.0, float(current_time - frame.last_referenced_time))

        # Recursive exponential decay: S(p) = S * 2^(-lambda * delta_t)
        s_decayed = compute_decayed_score(frame.hybrid_score, self.lambda_value, delta_t)

        # Dirty penalty delta (10ms I/O disk writeback latency)
        is_dirty = bool(frame.dirty_bit)
        dirty_penalty = self.delta if is_dirty else 0.0

        # Total Cost: C(p) = S(p) + Dirty Penalty
        total_cost = s_decayed + dirty_penalty
        candidates.append((round(total_cost, 9), frame.last_referenced_time, frame.frame_id, s_decayed))

    # Minimum C(p); tie-breaker: oldest referenced timestamp
    best_candidate = min(candidates, key=lambda c: (c[0], c[1], c[2]))
    return best_candidate[2]'''

    render_code_card(
        code1,
        title="src/engine.py — _select_victim_hybrid()",
        badge="Core Metric C(p) = S(p) + δ",
        output_filename="core_math_hybrid_decay.png"
    )

    # Snippet 2: Dynamic Tuning
    code2 = '''class AdaptiveParameterController:
    """
    Autonomous Parameter Controller for dynamic lambda tuning and cost penalties.
    Tuning Logic (Window-based evaluation):
        Every N accesses (window_size=100):
            r = faults_in_window / N
            If r > 0.10: lambda = min(1.0, lambda + 0.05)  # Shift towards LRU (recency)
            If r < 0.02: lambda = max(0.0, lambda - 0.05)  # Shift towards LFU (frequency)
    """
    def record_access(self, is_fault: bool) -> Optional[float]:
        self.window_accesses += 1
        if is_fault:
            self.window_faults += 1

        if self.window_accesses >= self.window_size:
            return self.tune()
        return None

    def tune(self) -> float:
        r = self.window_faults / self.window_size if self.window_size > 0 else 0.0

        # High fault rate -> memory thrashing pressure -> bias toward recency (LRU)
        if r > 0.10:
            self.lambda_value = min(1.0, round(self.lambda_value + 0.05, 6))
        # Very low fault rate -> stable locality -> bias toward frequency (LFU)
        elif r < 0.02:
            self.lambda_value = max(0.0, round(self.lambda_value - 0.05, 6))

        # Reset window counters
        self.window_faults = 0
        self.window_accesses = 0
        return self.lambda_value'''

    render_code_card(
        code2,
        title="src/engine.py — AdaptiveParameterController.tune()",
        badge="Dynamic λ Tuning Dial",
        output_filename="dynamic_tuning_controller.png"
    )

    # Snippet 3: Baseline Algorithms
    code3 = '''# Baseline Replacement Algorithms (Industry Standards for Empirical Benchmark)

def _select_victim_fifo(self) -> int:
    """FIFO: Evicts frame that arrived earliest (smallest load_time)."""
    candidates = [(self.memory_manager.get_frame(fid).load_time, fid)
                  for fid in self.memory_manager.occupied_frames]
    return min(candidates, key=lambda c: (c[0], c[1]))[1]

def _select_victim_lru(self) -> int:
    """LRU: Evicts frame referenced least recently (smallest last_referenced_time)."""
    candidates = [(self.memory_manager.get_frame(fid).last_referenced_time, fid)
                  for fid in self.memory_manager.occupied_frames]
    return min(candidates, key=lambda c: (c[0], c[1]))[1]

def _select_victim_lfu(self) -> int:
    """LFU: Evicts frame with lowest access count (LRU tie-breaker)."""
    candidates = [(self.memory_manager.get_frame(fid).access_count,
                   self.memory_manager.get_frame(fid).last_referenced_time, fid)
                  for fid in self.memory_manager.occupied_frames]
    return min(candidates, key=lambda c: (c[0], c[1], c[2]))[2]'''

    render_code_card(
        code3,
        title="src/engine.py — Baseline Algorithms (FIFO / LRU / LFU)",
        badge="Hardware Baseline Standard",
        output_filename="baseline_algorithms_fifo_lru_lfu.png"
    )

    # Snippet 4: Workload Generation
    code4 = '''def generate_zipf_hot_cold(
    self, page_range, hot_page_ratio=0.2, hot_request_ratio=0.8,
    num_references=1000, write_probability=0.2
) -> List[Tuple[int, bool]]:
    """
    Simulates high temporal locality: 80% of references target 20% of pages (Pareto/Zipf).
    Attaches dirty write operations according to write_probability.
    """
    pages = _parse_page_range(page_range)
    num_hot = max(1, int(round(len(pages) * hot_page_ratio)))
    hot_pages, cold_pages = pages[:num_hot], pages[num_hot:]

    references: List[int] = []
    for _ in range(num_references):
        if not cold_pages or self.rng.random() < hot_request_ratio:
            chosen = self.rng.choice(hot_pages)
        else:
            chosen = self.rng.choice(cold_pages)
        references.append(chosen)

    return self._attach_writes(references, include_writes=True, write_probability=write_probability)

def generate_loop(self, page_range, loop_size=5, num_iterations=10, write_probability=0.2):
    """Cyclic memory loops mimicking sequential iteration, array scans, or batch workloads."""
    pages = _parse_page_range(page_range)[:loop_size]
    references = pages * num_iterations
    return self._attach_writes(references, include_writes=True, write_probability=write_probability)'''

    render_code_card(
        code4,
        title="src/workload.py — generate_zipf_hot_cold() & generate_loop()",
        badge="Workload Locality Generators",
        output_filename="workload_generation_zipf_loop.png"
    )

if __name__ == '__main__':
    generate_all_snippets()
