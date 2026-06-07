import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create user with Admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    // Create coach record
    const { error: insertError } = await supabase
      .from("coaches")
      .insert([{
        user_id: user.id,
        nombre,
        email,
        plan: "basico",
        plan_limite: 20
      }]);

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    return res.status(200).json({
      success: true,
      message: "Coach creado exitosamente",
      email,
      password
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
