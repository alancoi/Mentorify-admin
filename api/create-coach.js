import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { nombre, email, password, plan = 'basico', valor_plan = 0 } = req.body;

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

    const planLimits = {
      basico: 20,
      medio: 50,
      pro: 100
    };

    // Check if coach already exists in table
    const { data: existingCoach } = await supabase
      .from("coaches")
      .select("id")
      .eq("email", email)
      .single();

    if (existingCoach) {
      return res.status(400).json({ error: "Este coach ya existe" });
    }

    // Try to create or get user
    let userId = null;

    // First, try to create the user
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (user) {
      userId = user.id;
    } else if (createError && createError.message.includes("already been registered")) {
      // User exists, get their ID
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    if (!userId) {
      return res.status(400).json({ error: "No se pudo crear el usuario" });
    }

    // Create coach record
    const { error: insertError } = await supabase
      .from("coaches")
      .insert([{
        user_id: userId,
        nombre,
        email,
        plan: plan,
        plan_limite: planLimits[plan] || 20,
        valor_plan: parseFloat(valor_plan) || 0,
        created_at: new Date().toISOString()
      }]);

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    return res.status(200).json({
      success: true,
      email,
      password,
      plan
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
