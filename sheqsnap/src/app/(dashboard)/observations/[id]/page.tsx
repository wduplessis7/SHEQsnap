import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ObservationDetail from "./ObservationDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `Observation | SHEQSnap` };
}

export default async function ObservationPage({ params }: { params: { id: string } }) {
  const observation = await prisma.behaviourObservation.findUnique({
    where: { id: params.id },
    include: { actions: { orderBy: { createdAt: "asc" } }, evidence: true },
  });

  if (!observation || observation.status === "DELETED") notFound();

  return <ObservationDetail observation={JSON.parse(JSON.stringify(observation))} />;
}
