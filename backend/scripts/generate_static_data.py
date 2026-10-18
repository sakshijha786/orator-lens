import os
import sys
import json
import shutil

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

import server
from server import load_manifest, analyze_speech_tier, AnalyzeRequest, get_benchmark_report, get_speeches

def main():
    root_dir = os.path.dirname(backend_dir)
    public_dir = os.path.join(root_dir, "frontend", "public")
    api_dir = os.path.join(public_dir, "api")
    analyze_dir = os.path.join(api_dir, "analyze")
    audio_dir = os.path.join(api_dir, "audio")
    speeches_src = os.path.join(root_dir, "data", "speeches")

    os.makedirs(analyze_dir, exist_ok=True)
    os.makedirs(audio_dir, exist_ok=True)

    print("Copying audio files to frontend/public/api/audio...")
    for item in os.listdir(speeches_src):
        s_src = os.path.join(speeches_src, item)
        s_dst = os.path.join(audio_dir, item)
        if os.path.isdir(s_src):
            shutil.copytree(s_src, s_dst, dirs_exist_ok=True)
            print(f"  Copied {item}")

    # Generate speeches manifest in correct format expected by frontend
    speeches_data = get_speeches()
    # Ensure relative paths for static hosting
    for sp in speeches_data.get("speeches", []):
        sp["gold_audio_url"] = f"./api/audio/{sp['id']}/{os.path.basename(sp['gold_audio_url'])}"
        for af in sp.get("audio_files", []):
            af["url"] = f"./api/audio/{sp['id']}/{af['filename']}"

    speeches_json_path = os.path.join(api_dir, "speeches.json")
    speeches_noext_path = os.path.join(api_dir, "speeches")
    with open(speeches_json_path, "w", encoding="utf-8") as f:
        json.dump(speeches_data, f, indent=2)
    with open(speeches_noext_path, "w", encoding="utf-8") as f:
        json.dump(speeches_data, f, indent=2)
    print("Generated api/speeches.json and api/speeches")

    # Generate benchmark report
    benchmark_data = get_benchmark_report()
    benchmark_json_path = os.path.join(api_dir, "benchmark.json")
    benchmark_noext_path = os.path.join(api_dir, "benchmark")
    with open(benchmark_json_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)
    with open(benchmark_noext_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)
    print("Generated api/benchmark.json and api/benchmark")

    # Generate all analysis combinations
    manifest = load_manifest()
    total_combinations = 0
    for s_id, s_info in manifest.get("speeches", {}).items():
        for tier_key in s_info.get("audio_files", {}).keys():
            total_combinations += 1
            print(f"Analyzing {s_id} - {tier_key}...")
            req = AnalyzeRequest(speech_id=s_id, candidate_tier=tier_key)
            result = analyze_speech_tier(req)
            # Adjust audio URLs to be relative for static serving
            result["gold_audio_url"] = f"./api/audio/{s_id}/{s_info['audio_files']['gold_baseline']}"
            result["candidate_audio_url"] = f"./api/audio/{s_id}/{s_info['audio_files'][tier_key]}"

            out_file = os.path.join(analyze_dir, f"{s_id}_{tier_key}.json")
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2)

    print(f"Successfully generated all {total_combinations} static analysis files!")

if __name__ == "__main__":
    main()
