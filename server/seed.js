import bcrypt from 'bcryptjs';
import { initDb, saveClient, saveAdmin, getClients, getAdmin } from './db.js';
import { initialClients } from './seedData.js';

const seed = async () => {
  try {
    // 1. Initialize DB
    await initDb();

    console.log('Seeding database...');

    // 2. Seed Admin account
    const existingAdmin = await getAdmin('admin');
    if (!existingAdmin) {
      console.log('No admin found. Creating default admin account...');
      const adminPasswordHash = await bcrypt.hash('password', 10);
      await saveAdmin('admin', adminPasswordHash);
      console.log('Default admin account created: admin / password');
    } else {
      console.log('Admin account already exists.');
    }

    // 3. Seed Mock Clients
    const existingClients = await getClients();
    if (existingClients.length === 0) {
      console.log(`No clients found. Seeding ${initialClients.length} default client profiles...`);
      
      const bcryptPassHash = await bcrypt.hash('password', 10);

      for (const client of initialClients) {
        // Clone client data to avoid mutating original import
        const seededClient = JSON.parse(JSON.stringify(client));
        
        // Update client password hash to secure bcrypt hash for backend verification
        if (seededClient.passwordCreated) {
          seededClient.passwordHash = bcryptPassHash;
        }

        await saveClient(seededClient);
        console.log(`Seeded client: ${seededClient.name} (${seededClient.username})`);
      }
      console.log('Client profiles seeded successfully.');
    } else {
      console.log(`Database already has ${existingClients.length} clients. Skipping client seeding.`);
    }

    console.log('Database seeding process completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during database seeding:', err);
    process.exit(1);
  }
};

seed();
