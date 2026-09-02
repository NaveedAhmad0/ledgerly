import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    businessName: user?.businessName ?? "",
    address: user?.address ?? "",
    phone: user?.phone ?? "",
  });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.updateProfile(form);
      await refresh();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  return (
    <form className="max-w-lg space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Field label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Field
        label="Business"
        value={form.businessName}
        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
      />
      <Field
        label="Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
      />
      <Field label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Button>Save</Button>
    </form>
  );
}
