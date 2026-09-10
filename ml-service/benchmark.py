# -*- coding: utf-8 -*-
import json, sys, time, requests
from datetime import datetime
from pathlib import Path

BASE_URL = "http://localhost:8000"
ENDPOINT = BASE_URL + "/detect/voice"
TEST_FILE = Path(__file__).parent / "test_cases.json"
REPORT_FILE = Path(__file__).parent / "benchmark_results.md"

G="\033[92m"; R="\033[91m"; C="\033[96m"; B="\033[1m"; X="\033[0m"
def green(t): return G+str(t)+X
def red(t):   return R+str(t)+X
def cyan(t):  return C+str(t)+X
def bold(t):  return B+str(t)+X

def check_service():
    try:
        r = requests.get(BASE_URL, timeout=5); r.raise_for_status()
        print(green("[OK] Service is up: " + str(r.json())))
    except requests.ConnectionError:
        print(red("[ERROR] Cannot connect to " + BASE_URL)); sys.exit(1)
    except Exception as e:
        print(red("[ERROR] " + str(e))); sys.exit(1)

def call_endpoint(text):
    r = requests.post(ENDPOINT, json={"transcript": text}, timeout=30)
    r.raise_for_status(); return r.json()

def compute_metrics(tp, fp, tn, fn):
    total = tp+fp+tn+fn
    acc  = (tp+tn)/total if total else 0
    prec = tp/(tp+fp) if (tp+fp) else 0
    rec  = tp/(tp+fn) if (tp+fn) else 0
    f1   = 2*prec*rec/(prec+rec) if (prec+rec) else 0
    return acc, prec, rec, f1

def main():
    print(bold("\n" + "="*60))
    print(bold("  SheShield /detect/voice  --  Benchmark Runner"))
    print(bold("="*60 + "\n"))
    check_service(); print()

    cases = json.loads(TEST_FILE.read_text(encoding="utf-8"))
    n = len(cases)
    print("Loaded " + str(n) + " test cases from " + TEST_FILE.name + "\n")
    print("%3s  %-22s %5s %5s %-8s  %s" % ("ID","GROUP","EXP","GOT","RESULT","TEXT"))
    print("-"*110)

    results = []; tp=fp=tn=fn=0

    for case in cases:
        cid=case["id"]; text=case["text"]; expected=case["expected"]; group=case.get("group","")
        try:
            resp = call_endpoint(text)
        except Exception as e:
            print(red("[%2d] REQUEST FAILED: %s" % (cid, e)))
            results.append({**case,"response":None,"passed":False,"error":str(e)})
            fn += 1 if expected else 0; continue
        got = resp["distress_detected"]; passed = (got == expected)
        if expected and got:           tp+=1
        elif not expected and got:     fp+=1
        elif not expected and not got: tn+=1
        else:                          fn+=1
        rs = green("PASS") if passed else red("FAIL")
        short = (text[:68]+"...") if len(text)>68 else text
        es = "true " if expected else "false"; gs = "true " if got else "false"
        print("%3d  %-22s %5s %5s %-16s  %s" % (cid, group, es, gs, rs, short))
        results.append({**case,"response":resp,"passed":passed,"error":None})
        time.sleep(0.05)

    print("\n" + "-"*110)
    acc,prec,rec,f1 = compute_metrics(tp,fp,tn,fn)
    passed_count = sum(1 for r in results if r["passed"])

    print(bold("\nCONFUSION MATRIX"))
    print("  True  Positives (TP): %4d" % tp)
    print("  False Positives (FP): %4d  (includes deliberate trap cases)" % fp)
    print("  True  Negatives (TN): %4d" % tn)
    print("  False Negatives (FN): %4d" % fn)
    print(bold("\nMETRICS"))
    print("  Accuracy  : %.3f  (%.1f%%)" % (acc,  acc*100))
    print("  Precision : %.3f  (%.1f%%)" % (prec, prec*100))
    print("  Recall    : %.3f  (%.1f%%)" % (rec,  rec*100))
    print("  F1 Score  : %.3f  (%.1f%%)" % (f1,   f1*100))
    print("\n  Passed: " + green(str(passed_count)) + " / " + str(n) + "   Failed: " + red(str(n-passed_count)) + " / " + str(n))

    failing = [r for r in results if not r["passed"]]
    if failing:
        print(bold("\n" + "="*60))
        print(bold("  FAILING CASES -- Full Detail  (" + str(len(failing)) + " failures)"))
        print(bold("="*60))
        for r in failing:
            resp = r.get("response") or {}
            print("\n  " + red("[FAIL] Case #" + str(r["id"]) + "  group=" + r.get("group","")))
            print("  Text       : " + r["text"])
            print("  Expected   : " + str(r["expected"]) + "   Got: " + str(resp.get("distress_detected","N/A")))
            print("  Note       : " + r.get("note",""))
            if resp:
                print("  Confidence : " + str(resp.get("confidence")))
                print("  Category   : " + str(resp.get("category")) + "   Severity: " + str(resp.get("severity")))
                print("  Matched    : " + str(resp.get("matched_phrases")))
                ms = resp.get("model_signal",{})
                print("  ModelSignal: emotion=" + str(ms.get("emotion")) + "  conf=" + str(ms.get("confidence")) + "  distress=" + str(ms.get("distress_signal")))
            if r.get("error"):
                print("  Error      : " + str(r["error"]))
    else:
        print(bold(green("\n  All cases passed!")))

    write_report(results, tp, fp, tn, fn, acc, prec, rec, f1, passed_count, n)
    print("\n" + cyan("[Report]") + " Written to " + str(REPORT_FILE) + "\n")


def write_report(results, tp, fp, tn, fn, acc, prec, rec, f1, passed_count, n):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    L = []
    L.append("# SheShield `/detect/voice` Benchmark Report\n\n")
    L.append("**Generated:** " + ts + "  \n")
    L.append("**Endpoint:** `http://localhost:8000/detect/voice`  \n")
    L.append("**Test set:** " + str(n) + " cases  \n\n")
    L.append("## Summary\n\n| Metric | Value |\n|--------|-------|\n")
    L.append("| Accuracy  | %.3f (%.1f%%) |\n" % (acc,  acc*100))
    L.append("| Precision | %.3f (%.1f%%) |\n" % (prec, prec*100))
    L.append("| Recall    | %.3f (%.1f%%) |\n" % (rec,  rec*100))
    L.append("| F1 Score  | %.3f (%.1f%%) |\n" % (f1,   f1*100))
    L.append("| Passed    | " + str(passed_count) + " / " + str(n) + " |\n")
    L.append("| Failed    | " + str(n-passed_count) + " / " + str(n) + " |\n\n")
    L.append("## Confusion Matrix\n\n| | Predicted Distress | Predicted Safe |\n|---|---|---|\n")
    L.append("| **Actually Distress** | TP = " + str(tp) + " | FN = " + str(fn) + " |\n")
    L.append("| **Actually Safe** | FP = " + str(fp) + " (incl. deliberate traps) | TN = " + str(tn) + " |\n\n")
    L.append("> **Note on FP:** " + str(fp) + " false positive(s) include deliberate trap cases ")
    L.append("(benign sentences containing keyword substrings). Expected failures surfacing a known limitation.\n\n")
    L.append("## Per-Case Results\n\n| # | Group | Expected | Got | Pass | Text | Notes |\n|---|-------|----------|-----|------|------|-------|\n")
    for r in results:
        resp = r.get("response") or {}
        got = str(resp.get("distress_detected","ERR")) if resp else "ERR"
        status = "PASS" if r["passed"] else "FAIL"
        st = r["text"][:60] + ("..." if len(r["text"])>60 else "")
        sn = r.get("note","")[:80] + ("..." if len(r.get("note",""))>80 else "")
        L.append("| " + str(r["id"]) + " | " + r.get("group","") + " | " + str(r["expected"]) + " | " + got + " | " + status + " | " + st + " | " + sn + " |\n")
    L.append("\n## Failing Cases -- Full Detail\n\n")
    failing = [r for r in results if not r["passed"]]
    if not failing:
        L.append("*All cases passed!*\n")
    else:
        for r in failing:
            resp = r.get("response") or {}
            ms = resp.get("model_signal",{}) if resp else {}
            L.append("\n### FAIL Case #" + str(r["id"]) + " -- `" + r.get("group","") + "`\n\n")
            L.append("**Text:** " + r["text"] + "  \n")
            L.append("**Expected:** `" + str(r["expected"]) + "`  **Got:** `" + str(resp.get("distress_detected","N/A")) + "`  \n")
            L.append("**Note:** " + r.get("note","") + "  \n")
            if resp:
                L.append("**Confidence:** `" + str(resp.get("confidence")) + "`  \n")
                L.append("**Category:** `" + str(resp.get("category")) + "`  **Severity:** `" + str(resp.get("severity")) + "`  \n")
                L.append("**Matched phrases:** `" + str(resp.get("matched_phrases")) + "`  \n")
                L.append("**Model signal:** emotion=`" + str(ms.get("emotion")) + "` conf=`" + str(ms.get("confidence")) + "` distress_signal=`" + str(ms.get("distress_signal")) + "`  \n")
            if r.get("error"):
                L.append("**Error:** " + str(r["error"]) + "  \n")
    L.append("\n---\n\n*main.py, keyword list, and model were NOT modified.*  \n")
    L.append("*Failures in trap-keyword-fp group are expected and surface known engine limitations.*\n")
    REPORT_FILE.write_text("".join(L), encoding="utf-8")

if __name__ == "__main__":
    main()
