#!/usr/bin/env node

/**
 * Demo del sistema de códigos de acceso simples
 * El admin genera códigos de 8 caracteres que duran 12 horas
 * Run with: node demo-simple-auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function demo() {
  console.log('🔐 Sistema de Códigos de Acceso Simples - Demo\n');

  try {
    // Paso 1: Admin genera código simple
    console.log('1. 👨‍💼 Admin generando código de acceso simple...');
    const generateResponse = await axios.post(`${BASE_URL}/auth/generate-code`, {
      adminId: 'admin001',
      purpose: 'Acceso para usuarios del torneo de ajedrez'
    });

    const { accessCode, expiresAt, message } = generateResponse.data;
    console.log(`✅ ${message}`);
    console.log(`   📋 Código: ${accessCode}`);
    console.log(`   ⏰ Expira: ${expiresAt}`);
    console.log(`   📝 Comparte este código con los usuarios\n`);

    // Paso 2: Usuario usa el código para buscar partidas
    console.log('2. 👤 Usuario buscando partidas con el código...');
    const searchResponse = await axios.get(`${BASE_URL}/games/search`, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      },
      params: {
        player: 'Magnus',
        limit: 3
      }
    });

    console.log(`✅ Búsqueda exitosa!`);
    console.log(`   🎯 Partidas encontradas: ${searchResponse.data.games.length}`);
    console.log(`   📊 Total en base de datos: ${searchResponse.data.pagination.total}`);
    console.log(`   ⚡ Tiempo de búsqueda: ${searchResponse.data.searchTime}ms\n`);

    // Paso 3: Usuario usa código como parámetro de consulta
    console.log('3. 👤 Usuario usando código como parámetro de consulta...');
    const queryResponse = await axios.get(`${BASE_URL}/games/search`, {
      params: {
        access_code: accessCode,
        player: 'Carlsen',
        limit: 2
      }
    });

    console.log(`✅ Búsqueda con parámetro exitosa!`);
    console.log(`   🎯 Partidas encontradas: ${queryResponse.data.games.length}\n`);

    // Paso 4: Validar código
    console.log('4. ✅ Validando código de acceso...');
    const validateResponse = await axios.post(`${BASE_URL}/auth/validate`, {
      access_code: accessCode
    });

    console.log(`✅ Validación exitosa:`);
    console.log(`   📋 Código: ${validateResponse.data.codigo}`);
    console.log(`   🔢 Usos: ${validateResponse.data.usos}`);
    console.log(`   ⏳ Tiempo restante: ${validateResponse.data.tiempoRestante}\n`);

    // Paso 5: Obtener información del código
    console.log('5. ℹ️ Obteniendo información del código...');
    const infoResponse = await axios.get(`${BASE_URL}/auth/info`, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      }
    });

    console.log(`✅ Información del código:`);
    console.log(`   📋 Código: ${infoResponse.data.codigo}`);
    console.log(`   🔢 Usos totales: ${infoResponse.data.usos}`);
    console.log(`   ⏳ Tiempo restante: ${infoResponse.data.tiempoRestante}`);
    console.log(`   📅 Creado: ${new Date(infoResponse.data.creado).toLocaleString()}\n`);

    // Paso 6: Probar acceso sin código
    console.log('6. ❌ Probando acceso sin código...');
    try {
      await axios.get(`${BASE_URL}/games/search?player=Magnus`);
      console.log('❌ ¡Esto debería haber fallado!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctamente rechazado acceso sin código');
        console.log(`   💬 Error: ${error.response.data.message}\n`);
      } else {
        throw error;
      }
    }

    // Paso 7: Probar código inválido
    console.log('7. ❌ Probando código inválido...');
    try {
      await axios.get(`${BASE_URL}/games/search`, {
        headers: {
          'Authorization': 'Bearer INVALID123'
        },
        params: { player: 'Magnus' }
      });
      console.log('❌ ¡Esto debería haber fallado!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctamente rechazado código inválido');
        console.log(`   💬 Error: ${error.response.data.message}\n`);
      } else {
        throw error;
      }
    }

    // Paso 8: Admin ve estadísticas
    console.log('8. 📊 Admin consultando estadísticas...');
    const statsResponse = await axios.get(`${BASE_URL}/auth/stats`, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      }
    });

    console.log(`✅ Estadísticas del sistema:`);
    console.log(`   📋 Códigos totales: ${statsResponse.data.totalCodes}`);
    console.log(`   ✅ Códigos activos: ${statsResponse.data.activeCodes}`);
    console.log(`   📈 Uso total: ${statsResponse.data.totalUsage}\n`);

    // Paso 9: Admin lista códigos activos
    console.log('9. 📋 Admin listando códigos activos...');
    const codesResponse = await axios.get(`${BASE_URL}/auth/codes`, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      }
    });

    console.log(`✅ Códigos activos (${codesResponse.data.count}):`);
    codesResponse.data.activeCodes.forEach((code, index) => {
      console.log(`   ${index + 1}. ${code.accessCode} - ${code.usageCount} usos - ${code.timeRemaining} restante`);
    });
    console.log('');

    // Paso 10: Demostrar que el código funciona en diferentes formatos
    console.log('10. 🔄 Probando diferentes formatos del código...');
    
    // Formato en minúsculas
    const lowerResponse = await axios.get(`${BASE_URL}/games/search`, {
      params: {
        access_code: accessCode.toLowerCase(),
        player: 'Magnus',
        limit: 1
      }
    });
    console.log(`✅ Código en minúsculas funciona: ${lowerResponse.data.games.length} partidas`);

    // Formato con espacios
    const spacedResponse = await axios.get(`${BASE_URL}/games/search`, {
      params: {
        access_code: ` ${accessCode} `,
        player: 'Magnus',
        limit: 1
      }
    });
    console.log(`✅ Código con espacios funciona: ${spacedResponse.data.games.length} partidas\n`);

    console.log('🎉 ¡Demo completado exitosamente!');
    console.log('\n📝 Resumen del Sistema:');
    console.log('   ✅ Admin genera códigos simples de 8 caracteres');
    console.log('   ✅ Códigos válidos por exactamente 12 horas');
    console.log('   ✅ Usuarios pueden usar códigos de múltiples formas');
    console.log('   ✅ Sistema robusto con validación y limpieza');
    console.log('   ✅ Seguimiento de uso y estadísticas');
    console.log('   ✅ Interfaz en español para mejor UX');
    console.log('\n💡 Ventajas:');
    console.log('   • Códigos fáciles de compartir y recordar');
    console.log('   • No requiere tokens JWT complejos');
    console.log('   • Perfecto para eventos y torneos');
    console.log('   • Control total del admin sobre accesos');

  } catch (error) {
    console.error('❌ Demo falló:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Verificar si el servidor está ejecutándose
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Verificando si el servidor está ejecutándose...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ El servidor no está ejecutándose. Por favor inicia el servidor primero:');
    console.log('   npm start');
    process.exit(1);
  }
  
  console.log('✅ Servidor ejecutándose. Iniciando demo...\n');
  await demo();
}

if (require.main === module) {
  main();
}

module.exports = { demo };
