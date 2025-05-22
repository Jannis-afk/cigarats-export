// Initialize window.dataService if it doesn't exist
window.dataService = window.dataService || {};

// ===== PROFILE FUNCTIONS =====

window.dataService.getUserProfile = async function(userId) {
  const { data, error } = await window.supabase.from("profiles").select("*, created_at").eq("id", userId).single();
  if (error) throw error;
  return data;
};

window.dataService.getUsername = async function(userId) {
  const { data, error } = await window.supabase.from("profiles").select("username").eq("id", userId).single();
  if (error) throw error;
  return data.username;
};

window.dataService.getEmail = async function(userId) {
  const { data, error } = await window.supabase.from("profiles").select("email").eq("id", userId).single();
  if (error) throw error;
  return data.email;
};

window.dataService.getCigaretteBrand = async function(userId) {
  const { data, error } = await window.supabase.from("profiles").select("cigarette_brand").eq("id", userId).single();
  if (error) throw error;
  return data.cigarette_brand;
};

window.dataService.getPricePerPack = async function(userId) {
  const { data, error } = await window.supabase.from("profiles").select("price_per_pack").eq("id", userId).single();
  if (error) throw error;
  return data.price_per_pack;
};

window.dataService.getCigsPerPack = async function(userId) {
  const { data, error } = await window.supabase.from("profiles").select("cigs_per_pack").eq("id", userId).single();
  if (error) throw error;
  return data.cigs_per_pack;
};

window.dataService.setUsername = async function(userId, newUsername) {
  // Update auth user
  const { error: authError } = await window.supabase.auth.updateUser({
    data: { username: newUsername },
  });
  if (authError) throw authError;

  // Update profile
  const { error: profileError } = await window.supabase.from("profiles").update({ username: newUsername }).eq("id", userId);
  if (profileError) throw profileError;
};

window.dataService.setEmail = async function(userId, newEmail) {
  // Update auth user
  const { error: authError } = await window.supabase.auth.updateUser({
    email: newEmail,
  });
  if (authError) throw authError;

  // Update profile
  const { error: profileError } = await window.supabase.from("profiles").update({ email: newEmail }).eq("id", userId);
  if (profileError) throw profileError;
};

window.dataService.setCigaretteBrand = async function(userId, brand) {
  const { error } = await window.supabase.from("profiles").update({ cigarette_brand: brand }).eq("id", userId);
  if (error) throw error;
};

window.dataService.setPricePerPack = async function(userId, price) {
  // Remove dollar sign and parse to float
  const parsedPrice = parseFloat(price.toString().replace(/[^0-9.]/g, ''));
  
  // Round to nearest whole number
  const roundedPrice = Math.round(parsedPrice);

  // Update in Supabase
  const { error } = await window.supabase
    .from("profiles")
    .update({ price_per_pack: roundedPrice })
    .eq("id", userId);

  if (error) throw error;
};

window.dataService.setCigsPerPack = async function(userId, count) {
  const { error } = await window.supabase.from("profiles").update({ cigs_per_pack: count }).eq("id", userId);
  if (error) throw error;
};

// ===== CIGARETTE LOG FUNCTIONS =====

// Add this to your data.js file or modify the existing function

// Add cigarette smoked
window.dataService.addCigaretteSmoked = async (userId, notes = "", picUrl = null) => {
  try {
    const now = new Date()

    // Create cigarette log data
    const cigaretteData = {
      user_id: userId,
      created_at: now.toISOString(),
      notes: notes || null,
    }

    // Add pic_url if provided
    if (picUrl) {
      cigaretteData.pic_url = picUrl
    }

    // Insert into cigarette_logs table
    const { error } = await window.supabase.from("cigarette_logs").insert([cigaretteData])

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error adding cigarette:", error)
    throw error
  }
}

window.dataService.getLastCigaretteTime = async (userId) => {
  try {
    // Get the most recent cigarette log
    const { data, error } = await window.supabase
      .from("cigarette_logs")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw error

    // Return the created_at date if available, otherwise null
    if (data && data.length > 0 && data[0].created_at) {
      // Ensure we're returning a valid date string
      const dateObj = new Date(data[0].created_at)
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date from database:", data[0].created_at)
        return null
      }
      return data[0].created_at
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting last cigarette time:", error)
    return null
  }
}

window.dataService.getLastCigarettes = async function(userId, count) {
  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(count);

  if (error) throw error;
  return data;
};

window.dataService.getDailyCigarettes = async function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) throw error;
  return data.length;
};

window.dataService.getWeeklyCigarettes = async function(userId, startDate) {
  const startOfWeek = new Date(startDate);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startDate);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", startOfWeek.toISOString())
    .lte("created_at", endOfWeek.toISOString());

  if (error) throw error;
  return data.length;
};

window.dataService.getMoneySpent = async function(userId, startDate, endDate) {
  const { data: logs, error: logsError } = await window.supabase
    .from("cigarette_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (logsError) throw logsError;

  const { data: profile, error: profileError } = await window.supabase
    .from("profiles")
    .select("price_per_pack, cigs_per_pack")
    .eq("id", userId)
    .single();

  if (profileError) throw profileError;

  const cigarettesCount = logs.length;
  const packs = cigarettesCount / profile.cigs_per_pack;
  return (packs * profile.price_per_pack).toFixed(2);
};

window.dataService.getTimeSpentSmoking = async function(userId, startDate, endDate) {
  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (error) throw error;

  const minutes = data.length * 5; // Assuming 5 minutes per cigarette
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

window.dataService.getDayWithMostCigarettes = async function(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Group cigarettes by day
  const cigarettesByDay = {};
  data.forEach((log) => {
    const date = new Date(log.created_at).toISOString().split("T")[0];
    cigarettesByDay[date] = (cigarettesByDay[date] || 0) + 1;
  });

  // Find day with most cigarettes
  let maxDay = null;
  let maxCount = 0;

  for (const [day, count] of Object.entries(cigarettesByDay)) {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
  }

  return { date: maxDay, count: maxCount };
};

window.dataService.getMostSmokedTimeFrame = async function(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())

  if (error) throw error

  // Group cigarettes by hour
  const cigarettesByHour = {}
  data.forEach((log) => {
    const hour = new Date(log.created_at).getHours()
    cigarettesByHour[hour] = (cigarettesByHour[hour] || 0) + 1
  })

  // Find hour with most cigarettes
  let maxHour = null
  let maxCount = 0

  for (const [hour, count] of Object.entries(cigarettesByHour)) {
    if (count > maxCount) {
      maxCount = count
      maxHour = hour
    }
  }

  if (maxHour === null) return null

  // Format time frame
  const startHour = maxHour.toString().padStart(2, "0")
  const endHour = ((Number.parseInt(maxHour) + 1) % 24).toString().padStart(2, "0")
  return `${startHour}:00-${endHour}:00`
}

// ===== GROUP FUNCTIONS =====

window.dataService.getGroupMembers = async function(groupId) {
  const { data, error } = await window.supabase
    .from("group_members")
    .select(`
      user_id,
      profiles (
        id,
        username,
        email,
        cigarette_brand,
        cigs_per_pack,
        price_per_pack,
        avatar_url
      )
    `)
    .eq("group_id", groupId);

  if (error) throw error;
  return data.map((item) => item.profiles);
};

window.dataService.createGroup = async function(userId, name, description) {
  let inviteCode;
  let isUnique = false;

  while (!isUnique) {
    inviteCode = Array.from({ length: 6 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
    const { data, error } = await window.supabase.from("groups").select("id").eq("invite_code", inviteCode).single();
    if (error && error.code === "PGRST116") isUnique = true;
  }

  const { data, error } = await window.supabase
    .from("groups")
    .insert([{ name, description, created_by: userId, invite_code: inviteCode }])
    .select()
    .single();

  if (error) throw error;

  const { error: memberError } = await window.supabase.from("group_members").insert([{ group_id: data.id, user_id: userId }]);
  if (memberError) throw memberError;

  return data;
};

window.dataService.getUserCigaretteLogs = async function(userId, limit) {
  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit || 20);

  if (error) throw error;
  return data;
};

window.dataService.getGroupCigaretteLogs = async function(groupId) {
  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select(`*, profiles (username)`)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

window.dataService.getTodayCigaretteCount = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());

  if (error) throw error;
  return data.length;
};

window.dataService.getWeekCigaretteCount = async function(userId) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", weekStart.toISOString());

  if (error) throw error;
  return data.length;
};

window.dataService.calculateMoneySpent = function(cigaretteCount, pricePerPack, cigsPerPack) {
  const packs = cigaretteCount / cigsPerPack;
  return (packs * pricePerPack).toFixed(2);
};

window.dataService.calculateTimeSpent = function(cigaretteCount) {
  const minutes = cigaretteCount * 5;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

window.dataService.getGroupById = async function(groupId) {
  const { data, error } = await window.supabase.from("groups").select("*").eq("id", groupId).single();
  if (error) throw error;
  return data;
};

window.dataService.joinGroupWithCode = async function(userId, inviteCode) {
  const { data: group, error: groupError } = await window.supabase
    .from("groups")
    .select("id")
    .eq("invite_code", inviteCode)
    .single();

  if (groupError) throw groupError;

  const { data: existingMember, error: memberCheckError } = await window.supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .single();

  if (!memberCheckError && existingMember) throw new Error("You are already a member of this group");

  const { error: joinError } = await window.supabase.from("group_members").insert([{ group_id: group.id, user_id: userId }]);
  if (joinError) throw joinError;

  return group.id;
};

window.dataService.leaveGroup = async function(userId, groupId) {
  const { error } = await window.supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
};

window.dataService.getGroupScoreboard = async function(groupId) {
  const { data: members, error: membersError } = await window.supabase
    .from("group_members")
    .select(`user_id, profiles (id, username)`)
    .eq("group_id", groupId);

  if (membersError) throw membersError;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const scoreboard = await Promise.all(
    members.map(async (member) => {
      const { data, error } = await window.supabase
        .from("cigarette_logs")
        .select("*", { count: "exact" })
        .eq("user_id", member.user_id)
        .gte("created_at", weekStart.toISOString());

      if (error) throw error;

      return {
        userId: member.user_id,
        username: member.profiles.username,
        count: data.length,
      };
    })
  );

  return scoreboard.sort((a, b) => a.count - b.count);
};

window.dataService.getGroupActivity = async function(groupId) {
  const { data: members, error: membersError } = await window.supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (membersError) throw membersError;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const { data: logs, error: logsError } = await window.supabase
    .from("cigarette_logs")
    .select("created_at")
    .in("user_id", members.map(m => m.user_id))
    .gte("created_at", weekStart.toISOString())
    .order("created_at", { ascending: true });

  if (logsError) throw logsError;

  const activityByDay = Array(7).fill(0);
  logs.forEach((log) => {
    const dayIndex = (new Date(log.created_at).getDay() + 6) % 7;
    activityByDay[dayIndex]++;
  });

  return activityByDay;
};

window.dataService.formatDate = function(dateString) {
  return new Date(dateString).toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

window.dataService.formatRelativeDate = function(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

window.dataService.getCurrentUserId = async function() {
  const { data, error } = await window.supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id;
};

window.dataService.getGroupInviteCode = async function(groupId) {
  const { data, error } = await window.supabase.from("groups").select("invite_code").eq("id", groupId).single();
  if (error) throw error;
  return data.invite_code;
};

window.dataService.getWeeklyCigaretteData = async function(userId) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weeklyData = Array(7).fill(0);

  const { data, error } = await window.supabase
    .from("cigarette_logs")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", weekStart.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  data.forEach((log) => {
    const date = new Date(log.created_at);
    const dayIndex = date.getDay();
    weeklyData[dayIndex]++;
  });

  return weeklyData;
};

window.dataService.getUserInsights = async function(userId) {
  const insights = [];

  const dayWithMost = await window.dataService.getDayWithMostCigarettes(userId);
  if (dayWithMost && dayWithMost.date) {
    const dayName = new Date(dayWithMost.date).toLocaleDateString("en-US", { weekday: "long" });
    insights.push(`You smoke most on ${dayName}s (avg. ${dayWithMost.count} cigarettes)`);
  }

  const timeFrame = await window.dataService.getMostSmokedTimeFrame(userId);
  if (timeFrame) {
    insights.push(`Your peak smoking time is between ${timeFrame}`);
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const today = new Date();

  const moneySpent = await window.dataService.getMoneySpent(userId, monthStart, today);
  insights.push(`You've spent approximately $${moneySpent} on cigarettes this month`);

  const { data: allLogs, error: logsError } = await window.supabase
    .from("cigarette_logs")
    .select("group_id")
    .eq("user_id", userId)
    .is("group_id", null);

  if (!logsError) {
    const soloCount = allLogs.filter((log) => !log.group_id).length;
    const groupCount = allLogs.filter((log) => log.group_id).length;

    if (soloCount > 0 && groupCount > 0) {
      const ratio = Math.round((groupCount / soloCount) * 100);
      if (ratio > 100) {
        insights.push(`You smoke ${ratio - 100}% more when in groups`);
      } else {
        insights.push(`You smoke ${100 - ratio}% less when in groups`);
      }
    }
  }

  return insights;
};

window.dataService.getUserGroups = async function(userId) {
  const { data, error } = await window.supabase
    .from('group_members')
    .select('group_id, groups(name, description, created_by)')
    .eq('user_id', userId);

  if (error) throw error;
  
  // Transform the data to return group objects with id
  return data.map(item => ({
    id: item.group_id,
    name: item.groups.name,
    description: item.groups.description,
    created_by: item.groups.created_by
  }));
};
