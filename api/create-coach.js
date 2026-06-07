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

    // Check if coach already exists in table
    const { data: existingCoach } = await supabase
      .from("coaches")
      .select("id")
      .eq("email", email)
      .single();

    if (existingCoach) {
      return res.status(400).json({ error: "Este coach ya existe en el sistema" });
    }

    // Try to create user in Auth
    let userId = null;
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) {
      // If user already exists in Auth, try to get the user ID
      if (userError.message.includes("already been registered")) {
        // User exists in Auth, but not in coaches table
        // Get the user ID from Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          return res.status(400).json({ error: "No se pudo obtener el usuario existente" });
        }
        
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          return res.status(400).json({ error: userError.message });
        }
      } else {
        return res.status(400).json({ error: userError.message });
      }
    } else {
      userId = user.id;
    }

    // Create coach record
    const { error: insertError } = await supabase
      .from("coaches")
      .insert([{
        user_id: userId,
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
