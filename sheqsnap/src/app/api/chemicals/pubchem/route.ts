import { NextRequest, NextResponse } from "next/server";

interface PubChemPropertyResponse {
  PropertyTable?: {
    Properties?: Array<{
      CID: number;
      IUPACName?: string;
      MolecularFormula?: string;
      IsomericSMILES?: string;
    }>;
  };
}

interface PubChemClassificationNode {
  Name?: string;
  Information?: Array<{
    Name?: string;
    Value?: {
      StringWithMarkup?: Array<{ String: string }>;
    };
  }>;
  Node?: PubChemClassificationNode[];
}

interface PubChemClassificationResponse {
  Hierarchies?: {
    Hierarchy?: Array<{
      SourceName?: string;
      Node?: PubChemClassificationNode[];
    }>;
  };
}

function walkNodes(
  nodeList: PubChemClassificationNode[],
  state: {
    ghsPictograms: string[];
    hazardStatements: string[];
    precautionaryStatements: string[];
    hazardClass: string | null;
    signalWord: string | null;
  }
) {
  for (const node of nodeList) {
    const name = node.Name || "";
    const lowerName = name.toLowerCase();

    if (lowerName.includes("signal word") && node.Information) {
      for (const info of node.Information) {
        const val = info.Value?.StringWithMarkup?.[0]?.String;
        if (val) state.signalWord = val.trim();
      }
    }

    if (lowerName.includes("pictogram") && node.Information) {
      for (const info of node.Information) {
        const val = info.Value?.StringWithMarkup?.[0]?.String;
        if (val && !state.ghsPictograms.includes(val.trim())) {
          state.ghsPictograms.push(val.trim());
        }
      }
    }

    if (lowerName.includes("hazard statement") && node.Information) {
      for (const info of node.Information) {
        const val = info.Value?.StringWithMarkup?.[0]?.String;
        if (val && !state.hazardStatements.includes(val.trim())) {
          state.hazardStatements.push(val.trim());
        }
      }
    }

    if (lowerName.includes("precautionary statement") && node.Information) {
      for (const info of node.Information) {
        const val = info.Value?.StringWithMarkup?.[0]?.String;
        if (val && !state.precautionaryStatements.includes(val.trim())) {
          state.precautionaryStatements.push(val.trim());
        }
      }
    }

    if (
      (lowerName.includes("hazard class") || lowerName.includes("classification")) &&
      !state.hazardClass &&
      node.Information
    ) {
      for (const info of node.Information) {
        const val = info.Value?.StringWithMarkup?.[0]?.String;
        if (val) {
          state.hazardClass = val.trim();
          break;
        }
      }
    }

    if (node.Node && node.Node.length > 0) {
      walkNodes(node.Node, state);
    }
  }
}

function extractGhsData(data: PubChemClassificationResponse): {
  ghsPictograms: string[];
  hazardStatements: string[];
  precautionaryStatements: string[];
  hazardClass: string | null;
  signalWord: string | null;
} {
  const state = {
    ghsPictograms: [] as string[],
    hazardStatements: [] as string[],
    precautionaryStatements: [] as string[],
    hazardClass: null as string | null,
    signalWord: null as string | null,
  };

  try {
    const hierarchies = data?.Hierarchies?.Hierarchy || [];

    for (const hierarchy of hierarchies) {
      const sourceName = (hierarchy.SourceName || "").toLowerCase();
      if (!sourceName.includes("ghs") && !sourceName.includes("hazard")) continue;
      walkNodes(hierarchy.Node || [], state);
    }
  } catch {
    // Return partial/empty data if parsing fails
  }

  return state;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cas = searchParams.get("cas");
  const name = searchParams.get("name");

  if (!cas && !name) {
    return NextResponse.json({ error: "Provide ?cas= or ?name= query parameter" }, { status: 400 });
  }

  const query = encodeURIComponent((cas || name)!.trim());
  const baseUrl = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

  try {
    // Step 1: Get compound data by name/CAS
    const compoundRes = await fetch(`${baseUrl}/compound/name/${query}/JSON`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!compoundRes.ok) {
      if (compoundRes.status === 404) {
        return NextResponse.json({ error: "Compound not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "PubChem lookup failed" }, { status: 502 });
    }

    const compoundData = await compoundRes.json();
    const cid: number | undefined = compoundData?.PC_Compounds?.[0]?.id?.id?.cid;

    if (!cid) {
      return NextResponse.json({ error: "Compound not found" }, { status: 404 });
    }

    // Step 2: Get chemical properties
    const [propRes, classRes] = await Promise.allSettled([
      fetch(`${baseUrl}/compound/cid/${cid}/property/IUPACName,MolecularFormula,IsomericSMILES/JSON`, {
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`${baseUrl}/compound/cid/${cid}/classification/JSON`, {
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    let iupacName: string | null = null;
    let formula: string | null = null;

    if (propRes.status === "fulfilled" && propRes.value.ok) {
      const propData: PubChemPropertyResponse = await propRes.value.json();
      const props = propData?.PropertyTable?.Properties?.[0];
      if (props) {
        iupacName = props.IUPACName || null;
        formula = props.MolecularFormula || null;
      }
    }

    // Step 3: Parse GHS data from classification
    let ghsData = {
      ghsPictograms: [] as string[],
      hazardStatements: [] as string[],
      precautionaryStatements: [] as string[],
      hazardClass: null as string | null,
      signalWord: null as string | null,
    };

    if (classRes.status === "fulfilled" && classRes.value.ok) {
      try {
        const classData: PubChemClassificationResponse = await classRes.value.json();
        ghsData = extractGhsData(classData);
      } catch {
        // GHS parse failure is non-fatal
      }
    }

    return NextResponse.json({
      cid,
      name: iupacName,
      formula,
      ghsPictograms: ghsData.ghsPictograms,
      hazardStatements: ghsData.hazardStatements,
      precautionaryStatements: ghsData.precautionaryStatements,
      hazardClass: ghsData.hazardClass,
      signalWord: ghsData.signalWord,
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.code === "ABORT_ERR") {
      return NextResponse.json({ error: "PubChem request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Failed to fetch from PubChem" }, { status: 502 });
  }
}
