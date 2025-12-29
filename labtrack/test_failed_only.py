#!/usr/bin/env python3
"""
Quick test script - runs only on PDFs that had failures in the last run.
"""
import json
import sys
sys.path.insert(0, '.')

from ocr_gpt_quality_test import (
    process_pdf_with_gpt, evaluate_extraction, 
    load_groundtruth_csv, BLOODWORK_DIR, OUTPUT_DIR
)
from pathlib import Path

def main():
    # Load failures from last run
    with open('ocr_gpt_test_results/all_failures.json') as f:
        failures = json.load(f)
    
    # Get unique PDFs with failures
    failed_pdfs = sorted(set(f['pdf_name'] for f in failures))
    print(f"Testing {len(failed_pdfs)} PDFs that had failures...\n")
    
    # Load groundtruth
    groundtruth = load_groundtruth_csv(BLOODWORK_DIR / "bloodwork.csv")
    
    total_failures = []
    total_exact = 0
    total_fields = 0
    
    for i, pdf_name in enumerate(failed_pdfs, 1):
        pdf_path = BLOODWORK_DIR / pdf_name
        if not pdf_path.exists():
            print(f"[{i}/{len(failed_pdfs)}] {pdf_name[:50]}... NOT FOUND")
            continue
            
        gt_rows = groundtruth.get(pdf_name, [])
        print(f"[{i}/{len(failed_pdfs)}] {pdf_name[:50]}...")
        print(f"  Fields in groundtruth: {len(gt_rows)}")
        
        try:
            ocr_text, gpt_result = process_pdf_with_gpt(pdf_path)
            result = evaluate_extraction(gpt_result, gt_rows)
            
            exact = result.get("exact_matches", 0)
            fields = result.get("total_fields", 0)
            rate = result.get("exact_match_rate", 0)
            pdf_failures = result.get("failures", [])
            
            total_exact += exact
            total_fields += fields
            
            print(f"  Exact Matches: {exact}/{fields} ({rate}%)")
            if pdf_failures:
                print(f"  Failures ({len(pdf_failures)}):")
                for fail in pdf_failures[:3]:
                    print(f"    - {fail.get('biomarker', 'Unknown')}: {fail.get('reason', '')}")
                if len(pdf_failures) > 3:
                    print(f"    ... and {len(pdf_failures) - 3} more")
            
            for fail in pdf_failures:
                fail['pdf_name'] = pdf_name
            total_failures.extend(pdf_failures)
            
        except Exception as e:
            print(f"  ERROR: {e}")
        
        print()
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total PDFs tested: {len(failed_pdfs)}")
    print(f"Total fields: {total_fields}")
    print(f"Total matches: {total_exact}")
    print(f"Match rate: {total_exact/total_fields*100:.1f}%" if total_fields > 0 else "N/A")
    print(f"Total failures: {len(total_failures)}")
    
    # Save new failures
    with open('ocr_gpt_test_results/failures_retest.json', 'w') as f:
        json.dump(total_failures, f, indent=2, ensure_ascii=False)
    print(f"\nSaved to: ocr_gpt_test_results/failures_retest.json")

if __name__ == "__main__":
    main()
