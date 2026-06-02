import { prisma } from "@/lib/prisma";

export const metadata = { title: "Emergency Chemical Info" };

function safeParseJson(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function EmergencyPage({ params }: { params: { token: string } }) {
  const location = await (prisma as any).chemicalLocation.findUnique({
    where: { qrToken: params.token },
    include: {
      chemicalItem: {
        include: {
          sdsDocuments: {
            where: { isActive: true, deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          components: { include: { library: true } },
        },
      },
    },
  });

  if (!location || !location.chemicalItem || location.chemicalItem.deletedAt) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center">
          <p className="text-gray-600 text-lg">Chemical not found or no longer active.</p>
        </div>
      </div>
    );
  }

  const item = location.chemicalItem;
  const activeSds = item.sdsDocuments?.[0] ?? null;
  const components = item.components ?? [];

  const allPrecautionary = Array.from(
    new Set(
      components.flatMap((c: any) => safeParseJson(c.library?.precautionaryStatements))
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-[#1A1A1A] rounded-xl p-5 text-center shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FFFC41] mb-1">SHEQSnap</p>
          <h1 className="text-2xl font-extrabold uppercase tracking-wide text-white">
            Emergency Chemical Information
          </h1>
        </div>

        <div className="bg-teal-600 rounded-xl p-5 text-white text-center shadow">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">SA Poison Information Centre</p>
          <a href="tel:0861555777" className="text-3xl font-extrabold tracking-wide hover:underline block">
            0861 555 777
          </a>
          {item.emergencyContact && (
            <div className="mt-3 pt-3 border-t border-teal-500">
              <p className="text-xs opacity-80 uppercase tracking-wide mb-1">Site Emergency Contact</p>
              <a href={`tel:${item.emergencyContact}`} className="text-xl font-bold hover:underline">
                {item.emergencyContact}
              </a>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{item.productName}</h2>
            {item.tradeName && <p className="text-gray-500 text-sm mt-0.5">{item.tradeName}</p>}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {item.physicalState && (
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Physical State</dt>
                <dd className="text-gray-900 mt-0.5">{item.physicalState}</dd>
              </div>
            )}
            {item.flashPoint && (
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Flash Point</dt>
                <dd className="text-gray-900 mt-0.5">{item.flashPoint}</dd>
              </div>
            )}
            {item.unNumber && (
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">UN Number</dt>
                <dd className="font-mono font-bold text-gray-900 mt-0.5">{item.unNumber}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-2">
            {item.isHazardous && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                Hazardous
              </span>
            )}
          </div>
        </div>

        {components.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">Chemical Components</h3>
            {components.map((comp: any) => {
              const lib = comp.library;
              if (!lib) return null;
              const pics = safeParseJson(lib.ghsPictograms);
              const hazards = safeParseJson(lib.hazardStatements);

              return (
                <div key={comp.id} className="bg-white rounded-xl shadow p-5 space-y-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{lib.name}</span>
                    {lib.casNumber && (
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{lib.casNumber}</span>
                    )}
                    {comp.concentration && (
                      <span className="text-xs text-gray-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{comp.concentration}</span>
                    )}
                  </div>

                  {lib.signalWord === "DANGER" && (
                    <div className="w-full bg-red-600 text-white text-center font-extrabold text-lg py-2 rounded-lg tracking-widest">
                      DANGER
                    </div>
                  )}
                  {lib.signalWord === "WARNING" && (
                    <div className="w-full bg-orange-400 text-white text-center font-extrabold text-lg py-2 rounded-lg tracking-widest">
                      WARNING
                    </div>
                  )}

                  {pics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pics.map((p) => (
                        <span key={p} className="inline-flex items-center bg-orange-100 text-orange-900 text-sm font-bold px-3 py-1.5 rounded-lg border border-orange-200">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {hazards.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Hazard Statements</p>
                      <ol className="space-y-1">
                        {(hazards as string[]).map((s, i) => (
                          <li key={i} className="text-sm text-red-900 flex gap-2">
                            <span className="text-red-400 min-w-[1.5rem] font-medium">{i + 1}.</span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {allPrecautionary.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3">Precautionary Statements</h3>
            <ol className="space-y-1.5">
              {(allPrecautionary as string[]).map((s, i) => (
                <li key={i} className="text-sm text-blue-900 flex gap-2">
                  <span className="text-blue-400 min-w-[1.5rem] font-medium">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Storage Location</h3>
          <p className="text-gray-900 font-semibold">{location.locationName}</p>
          {location.buildingArea && <p className="text-gray-600 text-sm">{location.buildingArea}</p>}
          {location.quantity != null && (
            <p className="text-gray-600 text-sm mt-1">
              Quantity on site: <span className="font-semibold text-gray-900">{location.quantity} {location.unit || ""}</span>
            </p>
          )}
          {location.storageConditions && (
            <p className="text-gray-500 text-sm mt-1">Storage: {location.storageConditions}</p>
          )}
        </div>

        {activeSds && (
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Safety Data Sheet</h3>
            <a
              href={`/api/uploads/${activeSds.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Download SDS (v{activeSds.version})
            </a>
            {activeSds.language && <p className="text-xs text-gray-400 mt-1">{activeSds.language}</p>}
          </div>
        )}

        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-gray-400">SHEQSnap Emergency Information — For emergencies call 112</p>
        </div>
      </div>
    </div>
  );
}
