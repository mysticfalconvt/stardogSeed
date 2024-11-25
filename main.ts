import { faker } from 'https://deno.land/x/deno_faker@v1.0.3/mod.ts';
import stardog from 'npm:stardog';
import { createDatabase } from './createDB.ts';

const escapeDoubleQuotes = (text: string) => text.replace(/["\\]/g, '\\$&');
const escapeString = (str: string) => {
  return escapeDoubleQuotes(str.replace(/\s/g, '_').trim());
};

const conn = new stardog.Connection({
  username: 'admin',
  password: 'admin',
  endpoint: 'http://10.0.0.50:5820',
});

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

// This includes all of the info for the seed
const BASE_URI = 'tag:stardog:designer:seeded';
const modelUri = `${BASE_URI}:model`;
const dataUri = `${BASE_URI}:data`;
const database = 'aSeededDatabase';
const personClassCount = 50;
const personPerClassCount = 300;
const accountPerPersonCount = 3;
const orderPerAccountCount = 100;
const productPerOrderCount = 5;

const generateModelAndAddToDb = async (personClassCount: number) => {
  console.log('generating model');
  const prefixes = `
      @prefix : <http://api.stardog.com/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
      @prefix owl: <http://www.w3.org/2002/07/owl#> .
      @prefix so: <https://schema.org/> .
      @prefix stardog: <tag:stardog:api:> .
    `;

  const generatePersonClasses = () => {
    let personClasses = '';
    for (let i = 1; i <= personClassCount; i++) {
      personClasses += `
      <${modelUri}:Person_${i}> a owl:Class ;
        rdfs:label "Person ${i}" ;
        <tag:stardog:designer:colorId> "sd-qb-light-orange" .

      <${modelUri}:name_${i}> a owl:DatatypeProperty ;
        rdfs:label "name for Person ${i}" ;
        so:domainIncludes <${modelUri}:Person_${i}> ;
        so:rangeIncludes xsd:string .


      <${modelUri}:From_State_${i}> a owl:ObjectProperty ;
        rdfs:label "From State for Person ${i}" ;
        rdfs:comment "Person ${i} is from state" ;
        so:domainIncludes <${modelUri}:State> ;
        so:rangeIncludes <${modelUri}:Person_${i}> .
      
      <${modelUri}:Has_Account_${i}> a owl:ObjectProperty ;
        rdfs:label "Has Account for Person ${i}" ;
        rdfs:comment "Person ${i} has account" ;
        so:domainIncludes <${modelUri}:Person_${i}> ;
        so:rangeIncludes <${modelUri}:Account> .
      
      <${modelUri}:id_${i}> a owl:DatatypeProperty ;
        rdfs:label "id for Person ${i}" ;
        so:domainIncludes <${modelUri}:Person_${i}> ;
        so:rangeIncludes xsd:string .
      
      <${modelUri}:phone_${i}> a owl:DatatypeProperty ;
        rdfs:label "phone for Person ${i}" ;
        so:domainIncludes <${modelUri}:Person_${i}> ;
        so:rangeIncludes xsd:string .
      
      <${modelUri}:street_address_${i}> a owl:DatatypeProperty ;
        rdfs:label "street address for Person ${i}" ;
        so:domainIncludes <${modelUri}:Person_${i}> ;
        so:rangeIncludes xsd:string .
      
      <${modelUri}:zip_code_${i}> a owl:DatatypeProperty ;
        rdfs:label "zip code for Person ${i}" ;
        so:domainIncludes <${modelUri}:Person_${i}> ;
        so:rangeIncludes xsd:string .
        `;
    }
    return personClasses;
  };

  const accounts = `
      <${modelUri}:Account> a owl:Class ;
        rdfs:label "Account" ;
        <tag:stardog:designer:colorId> "sd-qb-orange" .
      <${modelUri}:Product> a owl:Class ;
        rdfs:label "Product" ;
        rdfs:comment "A product that can be ordered" ;
        <tag:stardog:designer:colorId> "sd-qb-yellow-green" .
      <${modelUri}:Purchase_Order> a owl:Class ;
        rdfs:label "Purchase Order" ;
        <tag:stardog:designer:colorId> "sd-qb-gold" .
      <${modelUri}:State> a owl:Class ;
        rdfs:label "State" ;
        rdfs:comment "state" ;
        <tag:stardog:designer:colorId> "sd-qb-red" .
  
      <${modelUri}:Purchase_Account> a owl:ObjectProperty ;
        rdfs:label "Purchase Account" ;
        so:domainIncludes <${modelUri}:Account> ;
        so:rangeIncludes <${modelUri}:Purchase_Order> .
      <${modelUri}:Purchased_on_order> a owl:ObjectProperty ;
        rdfs:label "Purchased on order" ;
        so:domainIncludes <${modelUri}:Purchase_Order> ;
        so:rangeIncludes <${modelUri}:Product> .
        
      <${modelUri}:account_number> a owl:DatatypeProperty ;
        rdfs:label "account number" ;
        so:domainIncludes <${modelUri}:Account> ;
        so:rangeIncludes xsd:string .
      <${modelUri}:account_type> a owl:DatatypeProperty ;
        rdfs:label "account type" ;
        so:domainIncludes <${modelUri}:Account> ;
        so:rangeIncludes xsd:string .
      <${modelUri}:Product_Description> a owl:DatatypeProperty ;
        rdfs:label "Product Description" ;
        so:domainIncludes <${modelUri}:Product> ;
        so:rangeIncludes xsd:string .
      <${modelUri}:product_ID> a owl:DatatypeProperty ;
        rdfs:label "product ID" ;
        so:domainIncludes <${modelUri}:Product> ;
        so:rangeIncludes xsd:string .
      <${modelUri}:Product_Name> a owl:DatatypeProperty ;
        rdfs:label "Product Name" ;
        so:domainIncludes <${modelUri}:Product> ;
        so:rangeIncludes xsd:string .
      <${modelUri}:Product_Price> a owl:DatatypeProperty ;
        rdfs:label "Product Price" ;
        so:domainIncludes <${modelUri}:Product> ;
        so:rangeIncludes xsd:float .
    `;

  const model = `
      ${prefixes}
  
      ${accounts}
      ${generatePersonClasses()}
    `;

  const transactionUUID = (await stardog.db.transaction.begin(conn, database))
    .body;
  await stardog.db.add(
    conn,
    database,
    transactionUUID,
    model,
    // @ts-ignore doesn't need encoding
    {
      contentType: 'text/turtle',
    },
    {
      graphUri: modelUri,
    },
  );

  const commit = await stardog.db.transaction.commit(
    conn,
    database,
    transactionUUID,
  );
  console.log('model added', commit.body);
};

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

const generateAndAddData = async (
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
    const percentageOfThisClass = i / numberOfPeople;
    const percentagePerClass = 100 / personClassCount;
    const totalPercentage =
      (personIndex - 1) * percentagePerClass +
      percentageOfThisClass * percentagePerClass;

    console.log(
      `Data generated for Person Class ${personIndex} of ${personClassCount} and personNumber ${i} of ${numberOfPeople} : ${totalPercentage.toFixed(
        3,
      )}%`,
    );
  }
};

const main = async () => {
  console.log('starting Seed');
  const result = await createDatabase(conn, database, modelUri);
  if (!result) {
    return;
  }
  await generateModelAndAddToDb(personClassCount);
  for (let i = 1; i <= personClassCount; i++) {
    await generateAndAddData(
      i,
      personPerClassCount,
      accountPerPersonCount,
      orderPerAccountCount,
      productPerOrderCount,
    );
    console.log(`Data generated for Person Class ${i} of ${personClassCount}`);
  }
  console.log('Seed completed');
};

main().catch(console.error);
