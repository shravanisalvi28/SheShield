# SheShield `/detect/voice` Benchmark Report

**Generated:** 2026-09-11 01:04:03  
**Endpoint:** `http://localhost:8000/detect/voice`  
**Test set:** 30 cases  

## Summary

| Metric | Value |
|--------|-------|
| Accuracy  | 0.733 (73.3%) |
| Precision | 0.706 (70.6%) |
| Recall    | 0.800 (80.0%) |
| F1 Score  | 0.750 (75.0%) |
| Passed    | 22 / 30 |
| Failed    | 8 / 30 |

## Confusion Matrix

| | Predicted Distress | Predicted Safe |
|---|---|---|
| **Actually Distress** | TP = 12 | FN = 3 |
| **Actually Safe** | FP = 5 (incl. deliberate traps) | TN = 10 |

> **Note on FP:** 5 false positive(s) include deliberate trap cases (benign sentences containing keyword substrings). Expected failures surfacing a known limitation.

## Per-Case Results

| # | Group | Expected | Got | Pass | Text | Notes |
|---|-------|----------|-----|------|------|-------|
| 1 | keyword-english | True | True | PASS | Help me please, I need someone to help me right now! | Direct keyword hit: help me, please help, i need help. Baseline true-positive. |
| 2 | keyword-english | True | True | PASS | I'm being attacked! Someone is attacking me right now! | Direct keyword hit: i'm being attacked, someone is attacking me. Category: assau... |
| 3 | keyword-english | True | True | PASS | Someone is following me and I can't shake them off. | Direct keyword hit: someone is following me. Category: following, severity: high... |
| 4 | keyword-english | True | True | PASS | There is real danger here, I don't feel safe at all. | Keyword hits: danger, i don't feel safe. Multi-phrase match, should boost confid... |
| 5 | keyword-high-severity | True | True | PASS | I'm being kidnapped, this man is forcing me into a car! | Direct keyword hit: i'm being kidnapped. Category: kidnapping, severity: critica... |
| 6 | keyword-high-severity | True | True | PASS | SOS emergency, call the police now! | Keyword hits: sos, emergency, call police. Multiple critical-category matches. |
| 7 | keyword-hindi | True | True | PASS | Bachao! Koi mujhe maar raha hai! | Hindi keyword hits: bachao, koi mujhe maar raha hai. Tests multilingual emergenc... |
| 8 | keyword-marathi | True | True | PASS | Mala madat kara, konitari vachva! | Marathi keyword hits: mala madat kara, konitari vachva. Tests Marathi emergency ... |
| 9 | keyword-hindi | True | True | PASS | Koi mera picha kar raha hai, mujhe dar lag raha hai. | Hindi keyword hits: koi mera picha kar raha hai, mujhe dar lag raha hai. Multi-p... |
| 10 | model-only | True | True | PASS | A man has grabbed my arm and won't let me leave this room. | NO keyword match expected. Describes physical restraint - relies on DistilRoBERT... |
| 11 | model-only | True | False | FAIL | He took my phone, locked the door, and said I'm not going an... | NO keyword match expected. Coercive control scenario with no explicit distress w... |
| 12 | model-only | True | True | PASS | I think something terrible is about to happen to me and ther... | NO keyword match expected. Expresses hopelessness and imminent threat indirectly... |
| 13 | model-only | True | False | FAIL | Please, I don't want to be here, I'm begging you, let me go. | NO keyword match expected. Pleading/desperation tone. Should trigger fear/sadnes... |
| 14 | model-only | True | False | FAIL | They're hurting me and nobody is coming to stop them. | NO keyword match expected. Active harm described without exact keyword phrases. |
| 15 | keyword-english | True | True | PASS | I'm being threatened at gunpoint, I am in danger right now. | Keyword hits: i'm being threatened, i am in danger. Category: threat, severity: ... |
| 16 | trap-keyword-fp | False | True | FAIL | Can you help me find a good recipe for pasta carbonara? | DELIBERATE TRAP: contains help me out of context. Keyword engine WILL flag this.... |
| 17 | trap-keyword-fp | False | True | FAIL | I'm so scared of spiders, I found one in my bathroom this mo... | DELIBERATE TRAP: contains i'm scared out of context. Keyword engine WILL flag ca... |
| 18 | trap-keyword-fp | False | True | FAIL | There's real danger in eating too much processed sugar every... | DELIBERATE TRAP: contains danger out of context (health advice). Known limitatio... |
| 19 | trap-keyword-fp | False | True | FAIL | I'm in trouble finishing this homework assignment before the... | DELIBERATE TRAP: contains i'm in trouble out of context. Known limitation: idiom... |
| 20 | trap-keyword-fp | False | True | FAIL | Can you help me move the sofa to the other side of the room? | DELIBERATE TRAP: contains help me out of context (chore request). Duplicate FP p... |
| 21 | neutral | False | False | PASS | I'll meet you at the coffee shop at 3 PM tomorrow, okay? | Plain scheduling sentence. No distress cues. |
| 22 | neutral | False | False | PASS | It looks like it will rain this afternoon, you should carry ... | Weather small-talk. Zero distress signal expected. |
| 23 | neutral | False | False | PASS | I need to pick up some groceries - milk, eggs, and bread. | Daily errand sentence. No keyword hits, no negative emotion expected. |
| 24 | neutral | False | False | PASS | The project deadline is next Friday so let's schedule a revi... | Professional/work scheduling. Neutral tone throughout. |
| 25 | neutral | False | False | PASS | My train arrives at 6, can you pick me up from the station? | Logistics request. No distress language or emotional signal. |
| 26 | positive-emotion | False | False | PASS | I just got the job offer! I'm so happy and excited about thi... | Strong positive emotion. False-positive control: model should classify joy/surpr... |
| 27 | positive-emotion | False | False | PASS | We won the match! This is the best day of my life, I can't b... | Excitement and joy. False-positive control - ensemble should return distress_det... |
| 28 | positive-emotion | False | False | PASS | I'm thrilled about the birthday party tonight, everyone I lo... | Warm, happy anticipation. No negative emotion signal expected. |
| 29 | neutral | False | False | PASS | The sunset over the mountains was absolutely breathtaking th... | Aesthetic/descriptive sentence. No distress, positive-neutral tone. Easy true-ne... |
| 30 | neutral | False | False | PASS | I don't understand this math problem, can someone explain it... | Academic confusion. No distress expected from keyword or model layer. |

## Failing Cases -- Full Detail


### FAIL Case #11 -- `model-only`

**Text:** He took my phone, locked the door, and said I'm not going anywhere tonight.  
**Expected:** `True`  **Got:** `False`  
**Note:** NO keyword match expected. Coercive control scenario with no explicit distress words - pure ML model test.  
**Confidence:** `0.0`  
**Category:** `none`  **Severity:** `none`  
**Matched phrases:** `[]`  
**Model signal:** emotion=`anger` conf=`0.41` distress_signal=`False`  

### FAIL Case #13 -- `model-only`

**Text:** Please, I don't want to be here, I'm begging you, let me go.  
**Expected:** `True`  **Got:** `False`  
**Note:** NO keyword match expected. Pleading/desperation tone. Should trigger fear/sadness signal in the emotion model.  
**Confidence:** `0.0`  
**Category:** `none`  **Severity:** `none`  
**Matched phrases:** `[]`  
**Model signal:** emotion=`sadness` conf=`0.464` distress_signal=`False`  

### FAIL Case #14 -- `model-only`

**Text:** They're hurting me and nobody is coming to stop them.  
**Expected:** `True`  **Got:** `False`  
**Note:** NO keyword match expected. Active harm described without exact keyword phrases.  
**Confidence:** `0.0`  
**Category:** `none`  **Severity:** `none`  
**Matched phrases:** `[]`  
**Model signal:** emotion=`anger` conf=`0.42` distress_signal=`False`  

### FAIL Case #16 -- `trap-keyword-fp`

**Text:** Can you help me find a good recipe for pasta carbonara?  
**Expected:** `False`  **Got:** `True`  
**Note:** DELIBERATE TRAP: contains help me out of context. Keyword engine WILL flag this. Known limitation: substring keyword matching causes false positives on benign help requests.  
**Confidence:** `0.8`  
**Category:** `emergency`  **Severity:** `critical`  
**Matched phrases:** `['help', 'help me']`  
**Model signal:** emotion=`neutral` conf=`0.88` distress_signal=`False`  

### FAIL Case #17 -- `trap-keyword-fp`

**Text:** I'm so scared of spiders, I found one in my bathroom this morning.  
**Expected:** `False`  **Got:** `True`  
**Note:** DELIBERATE TRAP: contains i'm scared out of context. Keyword engine WILL flag category:fear. Known limitation: fear keyword fires on phobias and mundane fears.  
**Confidence:** `0.955`  
**Category:** `fear`  **Severity:** `medium`  
**Matched phrases:** `[]`  
**Model signal:** emotion=`fear` conf=`0.955` distress_signal=`True`  

### FAIL Case #18 -- `trap-keyword-fp`

**Text:** There's real danger in eating too much processed sugar every day.  
**Expected:** `False`  **Got:** `True`  
**Note:** DELIBERATE TRAP: contains danger out of context (health advice). Known limitation: single-word danger is too broad.  
**Confidence:** `0.878`  
**Category:** `threat`  **Severity:** `high`  
**Matched phrases:** `['danger']`  
**Model signal:** emotion=`fear` conf=`0.878` distress_signal=`True`  

### FAIL Case #19 -- `trap-keyword-fp`

**Text:** I'm in trouble finishing this homework assignment before the deadline.  
**Expected:** `False`  **Got:** `True`  
**Note:** DELIBERATE TRAP: contains i'm in trouble out of context. Known limitation: idiomatic in trouble triggers distress flag.  
**Confidence:** `0.837`  
**Category:** `threat`  **Severity:** `high`  
**Matched phrases:** `["i'm in trouble"]`  
**Model signal:** emotion=`fear` conf=`0.837` distress_signal=`True`  

### FAIL Case #20 -- `trap-keyword-fp`

**Text:** Can you help me move the sofa to the other side of the room?  
**Expected:** `False`  **Got:** `True`  
**Note:** DELIBERATE TRAP: contains help me out of context (chore request). Duplicate FP pattern to show frequency of this limitation.  
**Confidence:** `0.8`  
**Category:** `emergency`  **Severity:** `critical`  
**Matched phrases:** `['help', 'help me']`  
**Model signal:** emotion=`neutral` conf=`0.623` distress_signal=`False`  

---

*main.py, keyword list, and model were NOT modified.*  
*Failures in trap-keyword-fp group are expected and surface known engine limitations.*
