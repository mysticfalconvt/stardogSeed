import stardog from 'stardog';

export const createDatabase = async (
  conn: stardog.Connection,
  database: string,
  modelUri: string,
) => {
  try {
    const deletedDb = await stardog.db.drop(conn, database);
    if (deletedDb?.status === 200) {
      console.log('database dropped');
    } else {
      console.log('database not deleted - did it exist?');
    }
  } catch (error) {
    console.error(error);
  }
  const newDatabase = await stardog.db.create(conn, database, {
    'search.enabled': true,
    'graph.aliases': true,
    'reasoning.schema.graphs': modelUri,
    'voicebox.enabled': true,
  });
  if (newDatabase?.status === 201) {
    console.log('database created');
  } else {
    console.log('database not created');
    return false;
  }
  await stardog.db.options.set(conn, database, {
    'reasoning.schemas': [`seeded=${modelUri}`],
  });
  const namespaces = await stardog.db.namespaces.add(
    conn,
    database,
    `@prefix : <http://api.stardog.com/> . @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> . @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . @prefix xsd: <http://www.w3.org/2001/XMLSchema#> . @prefix owl: <http://www.w3.org/2002/07/owl#> . @prefix so: <https://schema.org/> . @prefix stardog: <tag:stardog:api:> . @prefix seeded: <${modelUri}> .`,
  );
  if (namespaces?.status === 200) {
    console.log('namespaces created');
    return true;
  } else {
    console.log('namespaces not created');
    return false;
  }
};
