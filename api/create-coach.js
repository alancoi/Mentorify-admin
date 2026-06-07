import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { nombre, email, password, plan = 'basico' } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const supabaseUrl = "https://nufnlvalalandxodgcpr.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      return res.status(500).json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Plan limits
    const planLimits = {
      basico: 20,
      medio: 50,
      pro: 100
    };

    // Create user with Admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    // Create coach record with selected plan
    const { error: insertError } = await supabase
      .from("coaches")
      .insert([{
        user_id: user.id,
        nombre,
        email,
        plan: plan,
        plan_limite: planLimits[plan] || 20
      }]);

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    return res.status(200).json({
      success: true,
      message: "Coach creado exitosamente",
      email,
      password,
      plan
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
