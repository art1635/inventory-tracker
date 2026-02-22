# Inventory Tracker (SMB)

A simple web app for small businesses to track:

- **Products** – from suppliers (name, SKU, unit)
- **Suppliers** – who you buy from
- **Customers** – who you sell to
- **Purchases** – stock bought from suppliers (increases inventory)
- **Sales** – sales to customers (decreases inventory)
- **Inventory** – current stock, updated automatically on each purchase and sale

## Tech stack

- **Next.js 16** (App Router)
- **Prisma 7** + **SQLite** (no separate database server)
- **Tailwind CSS**

## Setup

1. Install dependencies (already done if you created the project):

   ```bash
   npm install
   ```

2. Database is already created. If you ever reset, run:

   ```bash
   npx prisma migrate dev
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## How to use

1. **Products** – Add your products (name, optional SKU, unit e.g. pcs, kg).
2. **Suppliers** – Add suppliers you purchase from.
3. **Customers** – Add customers you sell to.
4. **Purchases** – Record a purchase from a supplier; add line items (product, quantity, unit price). Inventory increases automatically.
5. **Sales** – Record a sale to a customer; add line items. Inventory decreases automatically. Sales will fail if stock is insufficient.
6. **Inventory** – View current stock per product. Low stock (≤10) is highlighted on the dashboard and on the Inventory page.

## Production

- Build: `npm run build`
- Start: `npm run start`
- Database file: `prisma/dev.db`. Back this up. For production you may want to set `DATABASE_URL` in the environment to an absolute path, e.g. `file:/var/app/data/inventory.db`.
