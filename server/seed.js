import bcrypt from 'bcryptjs';
import { 
  initDb, 
  saveClient, 
  saveAdmin, 
  getClients, 
  getAdmin, 
  closeDb,
  getTrainersList,
  saveTrainerProfile,
  getMembershipPlans,
  saveMembershipPlan,
  getPaymentRecords,
  recordPaymentTransaction,
  updateGymSettings
} from './db.js';
import { 
  initialClients, 
  initialTrainers, 
  initialMembershipPlans, 
  initialGymSettings, 
  initialPayments 
} from './seedData.js';

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

    // 4. Seed Trainers
    const existingTrainers = await getTrainersList();
    if (existingTrainers.length === 0) {
      for (const trainer of initialTrainers) {
        await saveTrainerProfile(trainer);
        console.log(`Seeded trainer: ${trainer.name}`);
      }
    }

    // 5. Seed Membership Plans
    const existingPlans = await getMembershipPlans();
    if (existingPlans.length === 0) {
      for (const plan of initialMembershipPlans) {
        await saveMembershipPlan(plan);
        console.log(`Seeded membership plan: ${plan.name}`);
      }
    }

    // 6. Seed Gym Settings
    await updateGymSettings(initialGymSettings);

    // 7. Seed Payments
    const existingPayments = await getPaymentRecords();
    if (existingPayments.length === 0) {
      for (const pay of initialPayments) {
        await recordPaymentTransaction(pay);
        console.log(`Seeded payment: ${pay.invoiceNumber} for client ${pay.clientId}`);
      }
    }

    console.log('Database seeding process completed successfully!');
    await closeDb();
    process.exit(0);
  } catch (err) {
    console.error('Error during database seeding:', err);
    process.exit(1);
  }
};

seed();
