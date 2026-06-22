import { X } from "lucide-react";
import { useNotifications } from "../../api/queries";
import { useAppContext } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";

export function AllNotifications() {
  const { isNotificationsViewOpen, setIsNotificationsViewOpen } = useAppContext();
  const { user } = useAuth();
  const { data = [] } = useNotifications(user?.userId);
  if (!isNotificationsViewOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 grid place-items-center p-4" onClick={() => setIsNotificationsViewOpen(false)}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 flex justify-between border-b dark:border-slate-800">
          <div><h2 className="text-xl font-bold">Toutes les notifications</h2><p className="text-sm text-slate-500">{data.length} éléments</p></div>
          <button onClick={() => setIsNotificationsViewOpen(false)}><X /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
          {data.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl border dark:border-slate-800">
              <div className="font-semibold">{item.title}</div>
              <div className="text-sm text-slate-500 mt-1">{item.message}</div>
              <div className="text-xs text-slate-400 mt-2">{new Date(item.createdAt).toLocaleString("fr-FR")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
