import { NextRequest, NextResponse } from "next/server";

interface ClaimRequestBody {
  airdropId: number;
  proof: {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    verification_level: string;
  };
  signal: string;
  action: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClaimRequestBody;

    // Debug mode: return mock success without calling CRE
    if (process.env.DEBUG_MODE === "true") {
      const mockNullifier = body.proof?.nullifier_hash ?? `0xdebug${body.airdropId}`;
      return NextResponse.json({
        success: true,
        txHash: `0xdebugtx${Date.now().toString(16)}`,
        nullifierHash: mockNullifier,
        debug: true,
      });
    }

    // Forward to CRE workflow HTTP trigger
    const creUrl = process.env.CRE_WORKFLOW_URL;
    if (!creUrl) {
      return NextResponse.json(
        { success: false, error: "CRE workflow URL not configured" },
        { status: 500 },
      );
    }

    const creResponse = await fetch(creUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!creResponse.ok) {
      const error = await creResponse.text();
      return NextResponse.json(
        { success: false, error },
        { status: creResponse.status },
      );
    }

    const result = await creResponse.json();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
