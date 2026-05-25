import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, roles, type RoleKey } from "@/lib/foundation-data";
import { createTask, listTasks } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type TaskRow = {
  id: string;
  title: string;
  taskType: string;
  lastName: string | null;
  firstName: string | null;
  priority: string;
};

async function createTaskAction(formData: FormData) {
  "use server";
  await createTask({
    ownerRoleKey: String(formData.get("ownerRoleKey") ?? ""),
    title: String(formData.get("title") ?? ""),
    taskType: String(formData.get("taskType") ?? "FOLLOW_UP"),
    priority: String(formData.get("priority") ?? "NORMAL"),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
  });
  revalidatePath("/app/pms");
  revalidatePath("/app/pms/tasks");
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const tasks = await listTasks(undefined, role.key);
  return (
    <FoundationShell active="/app/pms/tasks" roleKey={role.key}>
      <PageHeader eyebrow="PMS tasking" title="Role-owned work queue" body="Operational tasks belong to the role that can complete them: front desk, provider, hygiene, assistant, treatment coordinator, billing, manager, marketing, compliance, or support." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/tasks" />
      <PmsSectionNav active="/app/pms/tasks" roleKey={role.key} />
      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Create task" eyebrow="Workflow handoff">
          <form action={createTaskAction} className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Owner role<select name="ownerRoleKey" defaultValue={role.key} className="rounded-2xl border border-neutral-300 px-4 py-3">{roles.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Title<input name="title" required className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Type<input name="taskType" required defaultValue="FOLLOW_UP" className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Priority<select name="priority" className="rounded-2xl border border-neutral-300 px-4 py-3"><option>NORMAL</option><option>HIGH</option><option>LOW</option></select></label>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Due<input name="dueAt" type="datetime-local" className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Create task</button>
          </form>
        </PmsCard>
        <PmsCard title={`${role.title} queue`} eyebrow="Work to complete" action={<StatusPill tone={tasks.length ? "amber" : "green"}>{tasks.length} open</StatusPill>}>
          {tasks.length ? (tasks as TaskRow[]).map((task) => (
            <div key={task.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-950">{task.title}</p>
                  <p className="mt-1 text-sm text-neutral-600">{task.taskType.replaceAll("_", " ").toLowerCase()} · {task.lastName ? `${task.lastName}, ${task.firstName}` : "no patient attached"}</p>
                </div>
                <StatusFor value={task.priority} />
              </div>
            </div>
          )) : <EmptyPmsState title="No tasks assigned to this role" body="Tasks from schedule, chart, perio, treatment, billing, documents, and manager workflows will appear here only for the responsible role." />}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}
