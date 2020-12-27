const express = require("express");
const app = express();
const { Pool } = require("pg");
const bodyParser = require("body-parser");

// middleware
app.use(bodyParser.json());

const pool = new Pool({
  user: "thonynava",
  host: "localhost",
  database: "cyf_ecommerce",
  password: "",
  port: 5432,
});

app.get("/customers", async (req, res) => {
  try {
    await pool
      .query("SELECT * FROM customers")
      .then((result) => res.json(result.rows));
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/customers/:customerId", async (req, res) => {
  try {
    await pool
      .query("SELECT * FROM customers WHERE id = $1", [req.params.customerId])
      .then((result) => res.json(result.rows[0]));
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/customers", async (req, res) => {
  try {
    const newCustomerName = req.body.name;
    const newCustomerAddress = req.body.address;
    const newCustomerCity = req.body.city;
    const newCustomerCountry = req.body.country;
    const query =
      "INSERT INTO customers (name, address, city, country) VALUES ($1, $2, $3, $4)";

    await pool
      .query(query, [
        newCustomerName,
        newCustomerAddress,
        newCustomerCity,
        newCustomerCountry,
      ])
      .then((results) => res.send("New Customer added successfully."));
  } catch (err) {
    console.error(err.message);
  }
});

app.patch("/customers/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const newCustomerName = req.body.name;
    const newCustomerAddress = req.body.address;
    const newCustomerCity = req.body.city;
    const newCustomerCountry = req.body.country;

    await pool
      .query("SELECT * FROM customers WHERE id=$1;", [customerId])
      .then(async (result) => {
        if (result.rows.length > 0) {
          const customer = result.rows[0];

          if (req.body.name !== "" && req.body.name !== undefined) {
            customer.name = newCustomerName;
          }
          if (req.body.address !== "" && req.body.address !== undefined) {
            customer.address = newCustomerAddress;
          }
          if (req.body.city !== "" && req.body.city !== undefined) {
            customer.city = newCustomerCity;
          }
          if (req.body.country !== "" && req.body.country !== undefined) {
            customer.country = newCustomerCountry;
          }

          await pool
            .query(
              "UPDATE customers SET name=$2, address=$3, city=$4, country=$5 WHERE id=$1",
              [
                customer.id,
                customer.name,
                customer.address,
                customer.city,
                customer.country,
              ]
            )
            .then(() => res.send(`Customer ${customerId} updated!`));
        } else {
          return res
            .status(400)
            .send(
              "There is not a customer with that ID in our database. Please try again with a valid customer ID."
            );
        }
      });
  } catch (err) {
    console.error(err.message);
  }
});

app.delete("/customers/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;

    await pool
      .query("SELECT * FROM customers WHERE id=$1", [customerId])
      .then(async (result) => {
        if (result.rows.length === 1) {
          await pool
            .query("SELECT * FROM orders WHERE customer_id=$1", [customerId])
            .then(async (result) => {
              if (result.rows.length === 0) {
                await pool
                  .query("DELETE FROM customers WHERE id=$1", [customerId])
                  .then(() => res.send(`Customer ${customerId} deleted!`));
              } else {
                return res
                  .status(400)
                  .send(
                    "There is at least one order with this customer ID, Please delete all orders related to this user before deleting it."
                  );
              }
            });
        } else {
          return res
            .status(400)
            .send(
              "There is not a customer with that ID in our database. Please try again with a valid customer ID."
            );
        }
      });
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/suppliers", function (req, res) {
  pool.query("SELECT * FROM suppliers", (error, result) => {
    res.json(result.rows);
  });
});

app.get("/products", async (req, res) => {
  try {
    if (req.query.name) {
      await pool
        .query(
          "SELECT * FROM products WHERE product_name LIKE '%' || $1 || '%'",
          [req.query.name]
        )
        .then((result) => res.json(result.rows));
    } else {
      await pool
        .query("SELECT * FROM products")
        .then((result) => res.json(result.rows));
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/products", async (req, res) => {
  try {
    const newProductName = req.body.name;
    const newProductPrice = req.body.price;
    const newProductSupplierId = req.body.supplier;

    await pool
      .query("SELECT * FROM suppliers WHERE id = $1", [newProductSupplierId])
      .then(async (result) => {
        if (result.rows.length > 0) {
          if (parseInt(newProductPrice) > 0) {
            const query =
              "INSERT INTO products (product_name, unit_price, supplier_id) VALUES ($1, $2, $3)";
            await pool
              .query(query, [
                newProductName,
                newProductPrice,
                newProductSupplierId,
              ])
              .then((results) => res.send("New Product added successfully."));
          } else {
            res.status(400).send("The product price must be greater than 0.");
          }
        } else {
          return res
            .status(400)
            .send(
              "There is not a supplier with that ID in our database. Please try again with a valid supplier ID."
            );
        }
      });
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/customers/:customerId/orders", async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const query = `SELECT
      order_reference, 
      order_date, 
      product_name, 
      unit_price, 
      suppliers.supplier_name as supplier, 
      quantity
      FROM order_items
      JOIN orders
      ON order_items.order_id = orders.id
      JOIN products
      ON order_items.product_id = products.id
      JOIN suppliers
      ON products.supplier_id = suppliers.id
      JOIN customers
      ON orders.customer_id = customers.id
      WHERE customer_id = $1`;
    await pool
      .query(query, [customerId])
      .then((result) => res.json(result.rows));
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/customers/:customerId/orders", async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const newOderDate = req.body.date;
    const newOrderReference = req.body.reference;

    await pool
      .query("SELECT * FROM customers WHERE id = $1", [customerId])
      .then(async (result) => {
        if (result.rows.length > 0) {
          const query =
            "INSERT INTO orders (order_date, order_reference, customer_id) VALUES ($1, $2, $3)";
          await pool
            .query(query, [newOderDate, newOrderReference, customerId])
            .then((result) => res.send("New Order added successfully."));
        } else {
          return res
            .status(400)
            .send(
              "There is not a customer with that ID in our database. Please try again with a valid customer ID."
            );
        }
      });
  } catch (err) {
    console.error(err.message);
  }
});

app.delete("/orders/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;

    await pool
      .query("DELETE FROM order_items WHERE order_id=$1", [orderId])
      .then(async () => {
        await pool
          .query("DELETE FROM orders WHERE id=$1", [orderId])
          .then(() => res.send(`Order ${orderId} deleted!`));
      });
  } catch (err) {
    console.error(err.message);
  }
});

app.listen(3000, function () {
  console.log("Server is listening on port 3000. Ready to accept requests!");
});
