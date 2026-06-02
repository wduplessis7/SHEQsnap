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
      chemical: {
        include: {
          sdsDocuments: {
            where: { isActive: true, deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!location || location.chemical.deletedAt) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center">
          <p className="text-gray-600 text-lg">Chemical not found or no longer active.</p>
        </div>
      </div>
    );
  }

  const chemical = location.chemical;
  const activeSds = chemical.sdsDocuments?.[0] ?? null;
  const ghsPictograms = safeParseJson(chemical.ghsPictograms);
  const hazardStatements = safeParseJson(chemical.hazardStatements);
  const precautionaryStatements = safeParseJson(chemical.precautionaryStatements);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-red-600 rounded-xl p-5 text-white text-center shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">SHEQSnap</p>
          <h1 className="text-2xl font-extrabold uppercase tracking-wide">Emergency Chemical Info</h1>
        </div>

        <div className="bg-teal-600 rounded-xl p-5 text-white text-center shadow">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">SA Poison Information Centre</p>
          <a href="tel:0861555777" className="text-3xl font-extrabold tracking-wide hover:underline">
            0861 555 777
          </a>
        </div>

        {chemical.emergencyContact && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Emergency Contact</p>
            <a href={`tel:${chemical.emergencyContact}`} className="text-xl font-bold text-orange-800 hover:underline">
              {chemical.emergencyContact}
            </a>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{chemical.name}</h2>
            {chemical.tradeName && <p className="text-gray-500 text-sm mt-0.5">{chemical.tradeName}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {chemical.isHazardous && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                Hazardous
              </span>
            )}
            {chemical.signalWord === "DANGER" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-600 text-white">
                DANGER
              </span>
            )}
            {chemical.signalWord === "WARNING" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-400 text-white">
                WARNING
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {chemical.casNumber && (
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">CAS Number</dt>
                <dd className="font-mono font-bold text-gray-900 mt-0.5">{chemical.casNumber}</dd>
              </div>
            )}
            {chemical.hazardClass && (
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hazard Class</dt>
                <dd className="text-gray-900 mt-0.5">{chemical.hazardClass}</dd>
              </div>
            )}
            {chemical.physicalState && (
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Physical State</dt>
                <dd className="text-gray-900 mt-0.5">{chemical.physicalState}</dd>
              </div>
            )}
            {chemical.flashPoint && (
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Flash Point</dt>
                <dd className="text-gray-900 mt-0.5">{chemical.flashPoint}</dd>
              </div>
            )}
          </dl>
        </div>

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

        {ghsPictograms.length > 0 && (
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">GHS Pictograms</h3>
            <div className="flex flex-wrap gap-2">
              {ghsPictograms.map((p) => (
                <span key={p} className="inline-flex items-center bg-orange-100 text-orange-900 text-sm font-bold px-3 py-1.5 rounded-lg border border-orange-200">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {hazardStatements.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-5">
            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide mb-3">Hazard Statements</h3>
            <ol className="space-y-1.5">
              {hazardStatements.map((s, i) => (
                <li key={i} className="text-sm text-red-900 flex gap-2">
                  <span className="text-red-400 min-w-[1.5rem] font-medium">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {precautionaryStatements.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3">Precautionary Statements</h3>
            <ol className="space-y-1.5">
              {precautionaryStatements.map((s, i) => (
                <li key={i} className="text-sm text-blue-900 flex gap-2">
                  <span className="text-blue-400 min-w-[1.5rem] font-medium">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {activeSds && (
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Safety Data Sheet</h3>
            <a
              href={`/api/uploads/${activeSds.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Download SDS (v{activeSds.version})
            </a>
            {activeSds.language && <p className="text-xs text-gray-400 mt-1">{activeSds.language}</p>}
          </div>
        )}

        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-gray-400">SHEQSnap — Emergency Information</p>
        </div>
      </div>
    </div>
  );
}
