# AI Intelligence

---

## Overview

AI Intelligence is a licensed add-on module for SHEQSnap that uses a locally hosted AI model (Ollama) to analyse your safety data and generate actionable insights. All processing occurs on your VPS — no data is sent to the internet and no third-party API keys are required.

The module provides three features:

| Feature | Where to find it |
|---------|-----------------|
| **AI Safety Analysis** | Individual Incident and Near Miss detail pages |
| **AI Toolbox Talk Generator** | Toolbox Talks in the sidebar |
| **AI Predictive Risk Forecast** | Reports page |

---

## AI Safety Analysis

Available on individual Incident and Near Miss detail pages.

1. Open an incident or near miss record
2. Click the **AI Analysis** tab near the top of the detail page
3. Click **Analyse with AI**
4. Wait up to 60 seconds for the analysis to complete

The AI returns the following:

| Output | Description |
|--------|-------------|
| **Risk Level** | An overall risk badge: Critical, High, Medium, or Low |
| **Summary** | A concise plain-language description of the event |
| **Root Causes** | Underlying causes identified from the record data |
| **Immediate Actions** | Steps recommended to address the hazard without delay |
| **Preventive Measures** | Longer-term controls to prevent recurrence |
| **Investigation Checklist** | A structured checklist to guide the investigation |

To re-run the analysis after updating the record, click **Re-analyse**.

---

## AI Toolbox Talk Generator

Available under **Toolbox Talks** in the sidebar (AI Intelligence module required).

1. Set the **date range** to pull in relevant incidents and near misses (default: last 30 days)
2. Review the list of included records — optionally check or uncheck specific records
3. Optionally enter a specific **Topic** (e.g. "Electrical Safety") — leave blank to let the AI select the most relevant topic based on the data
4. Click **Generate Toolbox Talk**
5. Wait up to 60 seconds for the briefing to be produced

The generated Toolbox Talk includes:

| Section | Description |
|---------|-------------|
| **Title** | The safety topic for the briefing |
| **Date** | Date of the generated talk |
| **Facilitator** | Suggested facilitator role |
| **Duration** | Estimated running time |
| **Safety Message** | Opening statement to set the tone |
| **Key Points** | Three focused areas for discussion |
| **Discussion Questions** | Questions to engage the team |
| **Action Items** | Follow-up tasks for the team |
| **Takeaway Message** | Closing statement to reinforce the key lesson |

Print or share the output with your team before the next shift.

---

## AI Predictive Risk Forecast

Available on the **Reports** page, below the KPI summary cards.

1. Navigate to **Reports** in the sidebar
2. Click **Generate Forecast**
3. Wait up to 60 seconds for the forecast to complete

The AI analyses all safety statistics and returns the **Top 3 predicted risks** for your site. Each predicted risk includes:

| Output | Description |
|--------|-------------|
| **Risk Level** | CRITICAL, HIGH, MEDIUM, or LOW |
| **Trend** | Increasing, Stable, or Decreasing |
| **Description** | An explanation of the predicted risk based on current data patterns |
| **Recommended Actions** | Suggested proactive interventions |

Use the forecast to prioritise safety effort before incidents occur. Click **Regenerate** to refresh the forecast with the latest data.

---

## License Requirement

All AI features require the **AI Intelligence** module to be enabled on your SHEQSnap license. If the AI Analysis tab, Toolbox Talks menu item, or Predictive Risk Forecast section are not visible, the module may not be active on your account.

Contact your system administrator or VanTech Solutions to have the module enabled.

---

## Important Notes

- AI output is a starting point for analysis, not a replacement for professional SHEQ judgement.
- Always verify AI recommendations against actual site conditions, procedures, and regulatory requirements.
- Results may vary depending on the volume and completeness of data available in the system.
- All AI processing runs locally on your SHEQSnap server — no data leaves your environment.

---

[Back to Home](Home)
