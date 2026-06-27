import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { BackendRole, Employee } from "../../api/types";

interface Account {
  id: string;
  email: string;
  fullName: string;
  role: BackendRole;
  isActive: boolean;
  createdAt: string;
  employee?: Employee;
}

export function EmployeeAccountManagement() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["users"], queryFn: () => api.get<Account[]>("/users") });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<BackendRole>("COLLABORATOR");
  const create = useMutation({
    mutationFn: () => api.post("/users", { fullName, email, password, role }),
    onSuccess: async () => {
      setFullName("");
      setEmail("");
      setPassword("");
      await client.invalidateQueries({ queryKey: ["users"] });
    },
  });
  const workflow = useMutation({
    mutationFn: ({ employeeId, workflowType }: { employeeId: string; workflowType: "ONBOARDING" | "OFFBOARDING" }) =>
      api.post("/onboarding/activate", { employeeId, workflowType }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["users"] }),
        client.invalidateQueries({ queryKey: ["employees"] }),
        client.invalidateQueries({ queryKey: ["dashboard", "onboarding-progress"] }),
        client.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
  const act = async (account: Account, action: "activate" | "deactivate" | "delete") => {
    if (action === "delete") await api.delete(`/users/${account.id}`);
    else await api.patch(`/users/${account.id}/${action}`);
    await client.invalidateQueries({ queryKey: ["users"] });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };
  const startWorkflow = (account: Account, workflowType: "ONBOARDING" | "OFFBOARDING") => {
    if (account.employee?.id) workflow.mutate({ employeeId: account.employee.id, workflowType });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">Gestion des comptes</h1>
      <form onSubmit={submit} className="grid md:grid-cols-5 gap-3 p-5 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800">
        <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="p-3 rounded-xl border dark:bg-slate-800" placeholder="Nom complet" />
        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="p-3 rounded-xl border dark:bg-slate-800" placeholder="E-mail" />
        <input required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="p-3 rounded-xl border dark:bg-slate-800" placeholder="Mot de passe temporaire" />
        <select value={role} onChange={(event) => setRole(event.target.value as BackendRole)} className="p-3 rounded-xl border dark:bg-slate-800">
          <option value="COLLABORATOR">Collaborateur</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">RH</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button className="rounded-xl bg-blue-600 text-white font-bold">{create.isPending ? "Création…" : "Créer"}</button>
      </form>
      <div className="rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800">
              <th className="p-4 text-left">Utilisateur</th>
              <th className="p-4 text-left">Rôle</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Workflow</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((account) => {
              const workflowBusy = account.employee?.status === "ONBOARDING" || account.employee?.status === "OFFBOARDING";
              return (
                <tr key={account.id} className="border-t dark:border-slate-800">
                  <td className="p-4">
                    <b>{account.fullName}</b>
                    <div className="text-xs text-slate-500">{account.email}</div>
                  </td>
                  <td className="p-4">{account.role}</td>
                  <td className="p-4 text-center">{account.isActive ? "Actif" : "Suspendu"}</td>
                  <td className="p-4 text-center">
                    {account.employee?.id ? (
                      <div className="flex justify-center gap-2">
                        <button disabled={workflowBusy || workflow.isPending} onClick={() => startWorkflow(account, "ONBOARDING")} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Onboarding</button>
                        <button disabled={workflowBusy || workflow.isPending} onClick={() => startWorkflow(account, "OFFBOARDING")} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Offboarding</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Aucun profil employé lié</span>
                    )}
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => void act(account, account.isActive ? "deactivate" : "activate")} className="px-3 py-1.5 rounded-lg border">{account.isActive ? "Suspendre" : "Activer"}</button>
                    <button onClick={() => void act(account, "delete")} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600">Supprimer</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
