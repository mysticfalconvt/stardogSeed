import { faker } from 'https://deno.land/x/deno_faker@v1.0.3/mod.ts';
import stardog from 'npm:stardog';
import { database, dataUri, modelUri } from './constants.ts';

const escapeDoubleQuotes = (text: string) => text.replace(/["\\]/g, '\\$&');
const escapeString = (str: string) => {
  return escapeDoubleQuotes(str.replace(/\s/g, '_').trim());
};

const getRandomPerson = () => {
  return {
    id: escapeString(faker.random.uuid()),
    name: faker.name.findName(),
    email: faker.internet.email(),
    address: faker.address.streetAddress(),
    city: faker.address.city(),
    state: escapeString(faker.address.state()),
    zipCode: faker.address.zipCode(),
  };
};

const conn = new stardog.Connection({
  username: 'admin',
  password: 'admin',
  endpoint: 'http://10.0.0.50:5820',
});

const addDataToDB = async (data: string) => {
  const transaction = await stardog.db.transaction.begin(conn, database);
  const transactionUUID = transaction.body;

  await stardog.db.add(
    conn,
    database,
    transactionUUID,
    data,
    // @ts-ignore doesn't need encoding
    {
      contentType: 'text/turtle',
    },
    {
      graphUri: dataUri,
    },
  );
  const commit = await stardog.db.transaction.commit(
    conn,
    database,
    transactionUUID,
  );
  return commit;
};

export const generateAndAddData = async (
  personIndex: number,
  numberOfPeople: number,
  numberOfAccountsPerPerson: number,
  numberOfOrdersPerAccount: number,
  numberOfProductsPerOrder: number,
) => {
  for (let i = 1; i <= numberOfPeople; i++) {
    let data = '';
    const person = getRandomPerson();

    data += `
        <${dataUri}:state_${person.state}> a <${modelUri}:State> ;
          rdfs:label "${person.state}" .
      `;

    data += `
        <${dataUri}:${person.id}> a <${modelUri}:Person_${personIndex}> ;
          <${modelUri}:id_${personIndex}> "${person.id}" ;
          <${modelUri}:name_${personIndex}> "${person.name}" ;
          <${modelUri}:email_${personIndex}> "${person.email}" ;
          <${modelUri}:street_address_${personIndex}> "${person.address}" ;
          <${modelUri}:zip_code_${personIndex}> "${person.zipCode}" ;
          <${modelUri}:From_State_${personIndex}> <${dataUri}:state_${person.state}> .
      `;

    for (let j = 1; j <= numberOfAccountsPerPerson; j++) {
      const account = {
        accountNumber: faker.random.uuid(),
        accountType: faker.random.word(),
      };

      data += `
          <${dataUri}:${account.accountNumber}> a <${modelUri}:Account> ;
            <${modelUri}:account_number> "${account.accountNumber}" ;
            <${modelUri}:account_type> "${account.accountType}" .
  
          <${dataUri}:${person.id}> <${modelUri}:Has_Account_${personIndex}> <${dataUri}:${account.accountNumber}> .
        `;

      for (let k = 1; k <= numberOfOrdersPerAccount; k++) {
        const order = {
          orderNumber: faker.random.uuid(),
        };

        data += `
            <${dataUri}:${order.orderNumber}> a <${modelUri}:Purchase_Order> ;
              <${modelUri}:order_number> "${order.orderNumber}" .
  
            <${dataUri}:${account.accountNumber}> <${modelUri}:Purchase_Account> <${dataUri}:${order.orderNumber}> .
          `;

        for (let l = 1; l <= numberOfProductsPerOrder; l++) {
          const product = {
            productID: faker.random.uuid(),
            productName: faker.commerce.productName(),
            productDescription: faker.commerce.product(),
            productPrice: faker.commerce.price(),
          };

          data += `
              <${dataUri}:${product.productID}> a <${modelUri}:Product> ;
                <${modelUri}:product_ID> "${product.productID}" ;
                <${modelUri}:Product_Name> "${product.productName}" ;
                <${modelUri}:Product_Description> "${product.productDescription}" ;
                <${modelUri}:Product_Price> "${product.productPrice}"^^xsd:float .
  
              <${dataUri}:${order.orderNumber}> <${modelUri}:Purchased_on_order> <${dataUri}:${product.productID}> .
            `;
        }
      }
    }

    await addDataToDB(data);
    const percentageOfThisClass = (i / numberOfPeople) * 100;

    console.log(
      `Data generated for personClass ${personIndex} # ${i} of ${numberOfPeople} : ${percentageOfThisClass.toFixed(
        3,
      )}%`,
    );
  }
};
