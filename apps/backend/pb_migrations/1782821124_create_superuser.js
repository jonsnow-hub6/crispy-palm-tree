/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const email = "e2e@example.com";
  const password = "Aa123456"; // Better: read from an env var if possible

  // Check if the superuser already exists
  let admin;
  try {
    admin = app.findAuthRecordByEmail("_superusers", email);
  } catch (_) {
    admin = null;
  }

  if (!admin) {
    admin = new Record(app.findCollectionByNameOrId("_superusers"));
  }

  admin.set("email", email);
  admin.setPassword(password);

  app.save(admin);
});