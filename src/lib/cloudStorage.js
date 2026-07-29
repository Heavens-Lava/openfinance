import { supabase } from './supabase.js';

const BUCKET = 'macyfinance-files';

async function requireUser() {
  if (!supabase) throw new Error('MacyFinance cloud access is not configured.');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in to access your finance files.');
  return data.user;
}

function objectName(filename) {
  return encodeURIComponent(filename).replace(/\//g, '%2F');
}

function displayName(name) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export async function loadCloudFiles() {
  const user = await requireUser();
  const { data: objects, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(user.id, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (listError) throw listError;

  return Promise.all((objects || []).filter((item) => item.id).map(async (item) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(`${user.id}/${item.name}`);
    if (error) throw error;
    return { name: displayName(item.name), text: await data.text(), cloud: true };
  }));
}

export async function saveCloudFiles(files) {
  const user = await requireUser();
  const folder = user.id;
  const { data: current, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 1000 });
  if (listError) throw listError;

  const desiredNames = new Set(files.map((file) => objectName(file.name)));
  const stalePaths = (current || [])
    .filter((item) => item.id && !desiredNames.has(item.name))
    .map((item) => `${folder}/${item.name}`);
  if (stalePaths.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(stalePaths);
    if (error) throw error;
  }

  await Promise.all(files.map(async (file) => {
    const path = `${folder}/${objectName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(
      path,
      new Blob([file.text], { type: 'text/csv;charset=utf-8' }),
      { upsert: true, contentType: 'text/csv;charset=utf-8' },
    );
    if (error) throw error;
  }));
}
