import stardog from 'npm:stardog';
import {
  accountPerPersonCount,
  database,
  modelUri,
  orderPerAccountCount,
  personClassCount,
  personPerClassCount,
  productPerOrderCount,
} from './constants.ts';
import { createDatabase } from './createDB.ts';

const conn = new stardog.Connection({
  username: 'admin',
  password: 'admin',
  endpoint: 'http://10.0.0.50:5820',
});

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

const createWorker = (workerData: {
  classId: number;
  personPerClassCount: number;
  accountPerPersonCount: number;
  orderPerAccountCount: number;
  productPerOrderCount: number;
}) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url).href, {
      type: 'module',
      deno: { permissions: 'inherit' },
    });

    worker.onmessage = (e) => {
      if (e.data.success) {
        console.log(e.data.message);
        resolve(e.data);
      } else {
        reject(new Error(`Worker ${e.data.classId} failed: ${e.data.error}`));
      }
    };

    worker.onerror = (error) => {
      reject(new Error(`Worker ${workerData.classId} error: ${error.message}`));
    };

    worker.postMessage(workerData);
  });
};

const main = async () => {
  console.log('Starting Seed');
  const result = await createDatabase(conn, database, modelUri);
  if (!result) {
    return;
  }

  await generateModelAndAddToDb(personClassCount);

  const workerPromises = Array.from({ length: personClassCount }, (_, i) => {
    return createWorker({
      classId: i + 1,
      personPerClassCount,
      accountPerPersonCount,
      orderPerAccountCount,
      productPerOrderCount,
    });
  });

  try {
    await Promise.all(workerPromises);
    console.log('Seed completed');
  } catch (error) {
    console.error('Error during parallel processing:', error);
    throw error;
  }
};

main().catch(console.error);
