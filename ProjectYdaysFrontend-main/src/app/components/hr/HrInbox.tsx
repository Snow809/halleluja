import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { keys, useMutationWithInvalidation } from "../../api/queries";

type ContactStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

const labels: Record<ContactStatus, string> = {
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolue",
};

export function HrInbox() {
  const query = useQuery({
    queryKey: keys.hrContacts,
    queryFn: () => api.get<ContactRequest[]>("/hr-contact-requests"),
  });
  const update = useMutationWithInvalidation(
    ({ id, status }: { id: string; status: ContactStatus }) =>
      api.patch(`/hr-contact-requests/${id}/status`, { status }),
    [keys.hrContacts, keys.notifications],
  );

  if (query.isLoading) return <p className="text-slate-500">Chargement de la boîte de réception…</p>;
  if (query.isError) {
    return (
      <button className="rounded-xl bg-blue-600 px-4 py-2 text-white" onClick={() => query.refetch()}>
        Réessayer
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Boîte de réception RH</h1>
        <p className="text-slate-500">Demandes confidentielles envoyées par les collaborateurs.</p>
      </div>
      {!query.data?.length ? (
        <div className="rounded-3xl border bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Aucune demande de contact.
        </div>
      ) : (
        <div className="space-y-3">
          {query.data.map((request) => (
            <article key={request.id} className="rounded-3xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{request.name}</h2>
                  <p className="text-sm text-slate-500">{request.email}{request.phone ? ` · ${request.phone}` : ""}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{labels[request.status]}</span>
              </div>
              <p className="my-4 whitespace-pre-wrap text-sm">{request.message}</p>
              <div className="flex flex-wrap gap-2">
                {(["OPEN", "IN_PROGRESS", "RESOLVED"] as ContactStatus[]).map((status) => (
                  <button
                    key={status}
                    disabled={request.status === status || update.isPending}
                    onClick={() => update.mutate({ id: request.id, status })}
                    className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-40"
                  >
                    {labels[status]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
