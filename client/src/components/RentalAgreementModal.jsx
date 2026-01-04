/*
 * Rental Agreement Modal Component
 * Copyright (c) 2025 Alexander Orlov.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Trash2, FileText, ExternalLink, Loader2 } from 'lucide-react';
import api from '../services/api';

// ============== LOCAL DEFINITIONS (self-contained) ==============

// Rules texts - matching aegis-aa-web format
const RULES_TEXTS = {
  en: {
    rulesTitle: 'RULES OF ACTION',
    rulesSubtitle: '(see also Terms and Conditions)',
    ruleProhibitedDriver: 'It is absolutely PROHIBITED to use or operate this rented vehicle by anyone not listed on the rental agreement. Each driver must be pre-qualified in person with valid drivers license and be a minimum of 21 years of age.',
    ruleUnder25: 'If Driver is under the age of 25 additional fees may apply.',
    ruleAlcohol: 'It is absolutely PROHIBITED to use or operate this rented vehicle by anyone who is under the influence of ALCOHOL or any NARCOTICS.',
    ruleNoSmoking: 'There is absolute NO SMOKING allowed in the rented vehicle under any circumstances. Any found evidence of any kind of smoking in the vehicle a fine regardless of damage or not will apply.',
    ruleLostKeys: 'In case of LOST, DAMAGED or LOCKED INSIDE KEYS requiring key recovery a maximum charge may apply.',
    rulePassengerCapacity: 'The passenger capacity of this vehicle is determined by the number of seatbelts and, by law, must NOT be EXCEEDED. While in the Vehicle, please always fasten your seatbelts. It is the law!',
    ruleCleaningFee: 'In case the Vehicle will be returned exceptionally dirty a CLEANING FEE may apply.',
    ruleTires: "Flat or damaged TIRES are renter's responsibility of the Renter and are the financial responsibility of the Renter or Authorized Driver(s).",
    ruleTickets: 'ALL TICKETS, FINES, FEES and other received during the rental period, caused as a result of the renter and/or rental period must be paid by the Renter.',
    rule24Hour: 'Rental Days are based on 24 hour Rental Periods. Please return at the proper time. Each hour past the Rental Period will be calculated at ¼ of a day charge including all taxes and fees and up to a full day.',
    ruleNoCellPhone: "No cell phone use while operating the Vehicle unless it is a hands free device such as a Bluetooth. It's the law, the driver is prohibited from handling any Electronic device while driving regardless of the behavior of use.",
    ruleCardAuthorization: 'I authorize the rental company to charge my credit/debit card on file for: the rental amount, security deposit, fuel charges if applicable, traffic violations, parking tickets, toll charges, damage repairs, cleaning fees, and any other charges incurred during or as a result of this rental.',
    ruleTermsAgreement: 'I have read and agree to the',
    rentalTermsLink: 'Rental Terms and Conditions',
    rentalTermsTitle: 'RENTAL TERMS AND CONDITIONS',
    fullTermsNote: 'For complete terms and conditions, please visit',
    signatureLabel: 'Your Signature',
    signatureHelper: 'Please sign in the box above using your mouse or finger',
    clearSignature: 'Clear',
    agreementTitle: 'Rental Agreement',
    agreementSubtitle: 'Please review and sign the rental agreement',
    rentalSummary: 'Rental Summary',
    vehicle: 'Vehicle',
    pickupDate: 'Pickup Date',
    returnDate: 'Return Date',
    totalAmount: 'Total Amount',
    securityDeposit: 'Security Deposit',
    signatureRequired: 'Please provide your signature',
    allConsentsRequired: 'Please check all rules to continue',
    // Extended fields
    customerInfo: 'CUSTOMER / PRIMARY RENTER',
    additionalDriver: 'ADDITIONAL DRIVER',
    vehicleInfo: 'RENTAL VEHICLE',
    rentalPeriod: 'RENTAL PERIOD',
    fuelLevel: 'FUEL LEVEL',
    rentalRates: 'RENTAL RATE AND INVOICE',
    additionalCharges: 'ADDITIONAL CHARGES',
    additionalServices: 'Additional Services',
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    driverLicense: 'DL#',
    state: 'State',
    licenseExp: 'License Exp',
    dob: 'Date of Birth',
    address: 'Address',
    vehicleType: 'Vehicle Type',
    makeModel: 'Make/Model',
    yearColorLicense: 'Year/Color/License',
    vin: 'VIN',
    odometer: 'Odometer',
    startDate: 'Start Date',
    startTime: 'Start Time',
    dueDate: 'Due Date',
    returnTime: 'Return Time',
    fuelPickup: 'Fuel at Pickup',
    fuelReturn: 'Fuel at Return',
    ratePerDay: 'Rate per Day',
    numberOfDays: 'Days',
    dailyTotal: 'Daily Total',
    ratePerWeek: 'Rate per Week',
    numberOfWeeks: 'Weeks',
    weeklyTotal: 'Weekly Total',
    surchargeTax: 'Surcharge Tax',
    pickupDropoff: 'Pickup/Dropoff',
    cdw: 'CDW',
    gps: 'GPS',
    childSeat: 'Child Seat',
    driverUnder25Fee: 'Driver Under 25',
    additionalDriverFee: 'Additional Driver Fee',
    creditCardFee: 'Credit Card Fee',
    subtotal: 'Subtotal',
    vehicleStateTax: 'Vehicle State Tax',
    totalCharges: 'TOTAL CHARGES',
    lateReturnFee: 'Late Return Fee',
    damageFee: 'Damage Fee',
    fuelServiceFee: 'Fuel Service Fee',
    cleaningFee: 'Cleaning Fee',
    refund: 'Refund',
    balanceDue: 'BALANCE DUE',
  },
  es: {
    rulesTitle: 'REGLAS DE ACCIÓN',
    rulesSubtitle: '(ver también Términos y Condiciones)',
    ruleProhibitedDriver: 'Está absolutamente PROHIBIDO usar u operar este vehículo alquilado por cualquier persona que no esté listada en el contrato de alquiler. Cada conductor debe ser precalificado en persona con licencia de conducir válida y tener un mínimo de 21 años de edad.',
    ruleUnder25: 'Si el conductor es menor de 25 años pueden aplicar tarifas adicionales.',
    ruleAlcohol: 'Está absolutamente PROHIBIDO usar u operar este vehículo alquilado por cualquier persona que esté bajo la influencia de ALCOHOL o cualquier NARCÓTICO.',
    ruleNoSmoking: 'NO está permitido FUMAR en el vehículo alquilado bajo ninguna circunstancia. Cualquier evidencia encontrada de cualquier tipo de fumar en el vehículo aplicará una multa independientemente de si hay daño o no.',
    ruleLostKeys: 'En caso de LLAVES PERDIDAS, DAÑADAS o BLOQUEADAS DENTRO que requieran recuperación de llaves, puede aplicar un cargo máximo.',
    rulePassengerCapacity: 'La capacidad de pasajeros de este vehículo está determinada por el número de cinturones de seguridad y, por ley, NO debe EXCEDERSE. Mientras esté en el vehículo, siempre use el cinturón de seguridad. ¡Es la ley!',
    ruleCleaningFee: 'En caso de que el vehículo sea devuelto excepcionalmente sucio, puede aplicar una TARIFA DE LIMPIEZA.',
    ruleTires: 'Los NEUMÁTICOS pinchados o dañados son responsabilidad del Arrendatario y son la responsabilidad financiera del Arrendatario o Conductor(es) Autorizado(s).',
    ruleTickets: 'TODAS LAS MULTAS, PENALIZACIONES, TARIFAS y otros recibidos durante el período de alquiler, causados como resultado del arrendatario y/o período de alquiler deben ser pagados por el Arrendatario.',
    rule24Hour: 'Los Días de Alquiler se basan en Períodos de Alquiler de 24 horas. Por favor devuelva a tiempo. Cada hora pasada del Período de Alquiler se calculará a ¼ del cargo diario incluyendo todos los impuestos y tarifas y hasta un día completo.',
    ruleNoCellPhone: 'No usar el celular mientras opera el Vehículo a menos que sea un dispositivo manos libres como Bluetooth. Es la ley, el conductor tiene prohibido manejar cualquier dispositivo electrónico mientras conduce independientemente del comportamiento de uso.',
    ruleCardAuthorization: 'Autorizo a la empresa de alquiler a cargar en mi tarjeta de crédito/débito: el monto del alquiler, depósito de seguridad, cargos de combustible si aplica, infracciones de tráfico, multas de estacionamiento, cargos de peaje, reparaciones por daños, tarifas de limpieza y cualquier otro cargo incurrido durante o como resultado de este alquiler.',
    ruleTermsAgreement: 'He leído y acepto los',
    rentalTermsLink: 'Términos y Condiciones de Alquiler',
    rentalTermsTitle: 'TÉRMINOS Y CONDICIONES DE ALQUILER',
    fullTermsNote: 'Para los términos y condiciones completos, visite',
    signatureLabel: 'Su Firma',
    signatureHelper: 'Por favor firme en el cuadro de arriba usando su mouse o dedo',
    clearSignature: 'Borrar',
    agreementTitle: 'Contrato de Alquiler',
    agreementSubtitle: 'Por favor revise y firme el contrato de alquiler',
    rentalSummary: 'Resumen del Alquiler',
    vehicle: 'Vehículo',
    pickupDate: 'Fecha de Recogida',
    returnDate: 'Fecha de Devolución',
    totalAmount: 'Monto Total',
    securityDeposit: 'Depósito de Seguridad',
    signatureRequired: 'Por favor proporcione su firma',
    allConsentsRequired: 'Por favor marque todas las reglas para continuar',
    customerInfo: 'CLIENTE / ARRENDATARIO PRINCIPAL',
    additionalDriver: 'CONDUCTOR ADICIONAL',
    vehicleInfo: 'VEHÍCULO DE ALQUILER',
    rentalPeriod: 'PERÍODO DE ALQUILER',
    fuelLevel: 'NIVEL DE COMBUSTIBLE',
    rentalRates: 'TARIFA E FACTURA DE ALQUILER',
    additionalCharges: 'CARGOS ADICIONALES',
    additionalServices: 'Servicios Adicionales',
    firstName: 'Nombre',
    middleName: 'Segundo Nombre',
    lastName: 'Apellido',
    email: 'Correo',
    phone: 'Teléfono',
    driverLicense: 'Licencia',
    state: 'Estado',
    licenseExp: 'Venc. Licencia',
    dob: 'Fecha de Nacimiento',
    address: 'Dirección',
    vehicleType: 'Tipo de Vehículo',
    makeModel: 'Marca/Modelo',
    yearColorLicense: 'Año/Color/Placa',
    vin: 'VIN',
    odometer: 'Odómetro',
    startDate: 'Fecha Inicio',
    startTime: 'Hora Inicio',
    dueDate: 'Fecha Vencimiento',
    returnTime: 'Hora Devolución',
    fuelPickup: 'Combustible Recogida',
    fuelReturn: 'Combustible Devolución',
    ratePerDay: 'Tarifa por Día',
    numberOfDays: 'Días',
    dailyTotal: 'Total Diario',
    ratePerWeek: 'Tarifa por Semana',
    numberOfWeeks: 'Semanas',
    weeklyTotal: 'Total Semanal',
    surchargeTax: 'Recargo Impuesto',
    pickupDropoff: 'Recogida/Entrega',
    cdw: 'CDW',
    gps: 'GPS',
    childSeat: 'Silla Niño',
    driverUnder25Fee: 'Conductor Menor 25',
    additionalDriverFee: 'Conductor Adicional',
    creditCardFee: 'Cargo Tarjeta',
    subtotal: 'Subtotal',
    vehicleStateTax: 'Impuesto Estatal',
    totalCharges: 'CARGOS TOTALES',
    lateReturnFee: 'Cargo Devolución Tardía',
    damageFee: 'Cargo por Daños',
    fuelServiceFee: 'Cargo Combustible',
    cleaningFee: 'Cargo Limpieza',
    refund: 'Reembolso',
    balanceDue: 'SALDO PENDIENTE',
  },
  pt: {
    rulesTitle: 'REGRAS DE AÇÃO',
    rulesSubtitle: '(veja também Termos e Condições)',
    ruleProhibitedDriver: 'É absolutamente PROIBIDO usar ou operar este veículo alugado por qualquer pessoa não listada no contrato de aluguel. Cada motorista deve ser pré-qualificado pessoalmente com carteira de motorista válida e ter no mínimo 21 anos de idade.',
    ruleUnder25: 'Se o motorista tiver menos de 25 anos, taxas adicionais podem ser aplicadas.',
    ruleAlcohol: 'É absolutamente PROIBIDO usar ou operar este veículo alugado por qualquer pessoa que esteja sob a influência de ÁLCOOL ou qualquer NARCÓTICO.',
    ruleNoSmoking: 'NÃO é permitido FUMAR no veículo alugado sob nenhuma circunstância. Qualquer evidência encontrada de qualquer tipo de fumar no veículo, uma multa será aplicada independentemente de haver dano ou não.',
    ruleLostKeys: 'Em caso de CHAVES PERDIDAS, DANIFICADAS ou TRANCADAS DENTRO que requeiram recuperação de chaves, uma taxa máxima pode ser aplicada.',
    rulePassengerCapacity: 'A capacidade de passageiros deste veículo é determinada pelo número de cintos de segurança e, por lei, NÃO deve ser EXCEDIDA. Enquanto estiver no veículo, sempre use o cinto de segurança. É a lei!',
    ruleCleaningFee: 'Caso o veículo seja devolvido excepcionalmente sujo, uma TAXA DE LIMPEZA pode ser aplicada.',
    ruleTires: 'PNEUS furados ou danificados são responsabilidade do Locatário e são de responsabilidade financeira do Locatário ou Motorista(s) Autorizado(s).',
    ruleTickets: 'TODAS AS MULTAS, PENALIDADES, TAXAS e outros recebidos durante o período de aluguel, causados como resultado do locatário e/ou período de aluguel devem ser pagos pelo Locatário.',
    rule24Hour: 'Os Dias de Aluguel são baseados em Períodos de Aluguel de 24 horas. Por favor devolva no horário correto. Cada hora após o Período de Aluguel será calculada a ¼ da diária incluindo todos os impostos e taxas e até um dia inteiro.',
    ruleNoCellPhone: 'Não usar o celular enquanto opera o Veículo a menos que seja um dispositivo viva-voz como Bluetooth. É a lei, o motorista está proibido de manusear qualquer dispositivo eletrônico enquanto dirige, independentemente do comportamento de uso.',
    ruleCardAuthorization: 'Autorizo a empresa de aluguel a cobrar no meu cartão de crédito/débito: o valor do aluguel, depósito de segurança, cobranças de combustível se aplicável, infrações de trânsito, multas de estacionamento, cobranças de pedágio, reparos de danos, taxas de limpeza e quaisquer outras cobranças incorridas durante ou como resultado deste aluguel.',
    ruleTermsAgreement: 'Li e concordo com os',
    rentalTermsLink: 'Termos e Condições de Aluguel',
    rentalTermsTitle: 'TERMOS E CONDIÇÕES DE ALUGUEL',
    fullTermsNote: 'Para os termos e condições completos, visite',
    signatureLabel: 'Sua Assinatura',
    signatureHelper: 'Por favor assine na caixa acima usando seu mouse ou dedo',
    clearSignature: 'Limpar',
    agreementTitle: 'Contrato de Aluguel',
    agreementSubtitle: 'Por favor revise e assine o contrato de aluguel',
    rentalSummary: 'Resumo do Aluguel',
    vehicle: 'Veículo',
    pickupDate: 'Data de Retirada',
    returnDate: 'Data de Devolução',
    totalAmount: 'Valor Total',
    securityDeposit: 'Depósito de Segurança',
    signatureRequired: 'Por favor forneça sua assinatura',
    allConsentsRequired: 'Por favor marque todas as regras para continuar',
    customerInfo: 'CLIENTE / LOCATÁRIO PRINCIPAL',
    additionalDriver: 'MOTORISTA ADICIONAL',
    vehicleInfo: 'VEÍCULO DE ALUGUEL',
    rentalPeriod: 'PERÍODO DE ALUGUEL',
    fuelLevel: 'NÍVEL DE COMBUSTÍVEL',
    rentalRates: 'TARIFA E FATURA DE ALUGUEL',
    additionalCharges: 'COBRANÇAS ADICIONAIS',
    additionalServices: 'Serviços Adicionais',
    firstName: 'Nome',
    middleName: 'Nome do Meio',
    lastName: 'Sobrenome',
    email: 'E-mail',
    phone: 'Telefone',
    driverLicense: 'CNH',
    state: 'Estado',
    licenseExp: 'Venc. CNH',
    dob: 'Data de Nascimento',
    address: 'Endereço',
    vehicleType: 'Tipo de Veículo',
    makeModel: 'Marca/Modelo',
    yearColorLicense: 'Ano/Cor/Placa',
    vin: 'VIN',
    odometer: 'Odômetro',
    startDate: 'Data Início',
    startTime: 'Hora Início',
    dueDate: 'Data Vencimento',
    returnTime: 'Hora Devolução',
    fuelPickup: 'Combustível Retirada',
    fuelReturn: 'Combustível Devolução',
    ratePerDay: 'Diária',
    numberOfDays: 'Dias',
    dailyTotal: 'Total Diário',
    ratePerWeek: 'Semanal',
    numberOfWeeks: 'Semanas',
    weeklyTotal: 'Total Semanal',
    surchargeTax: 'Taxa Extra',
    pickupDropoff: 'Retirada/Entrega',
    cdw: 'CDW',
    gps: 'GPS',
    childSeat: 'Cadeira Criança',
    driverUnder25Fee: 'Motorista -25',
    additionalDriverFee: 'Motorista Adicional',
    creditCardFee: 'Taxa Cartão',
    subtotal: 'Subtotal',
    vehicleStateTax: 'Imposto Estadual',
    totalCharges: 'TOTAL',
    lateReturnFee: 'Taxa Atraso',
    damageFee: 'Taxa Danos',
    fuelServiceFee: 'Taxa Combustível',
    cleaningFee: 'Taxa Limpeza',
    refund: 'Reembolso',
    balanceDue: 'SALDO DEVIDO',
  },
  de: {
    rulesTitle: 'VERHALTENSREGELN',
    rulesSubtitle: '(siehe auch AGB)',
    ruleProhibitedDriver: 'Es ist absolut VERBOTEN, dieses gemietete Fahrzeug von Personen zu benutzen, die nicht im Mietvertrag aufgeführt sind. Jeder Fahrer muss persönlich mit gültigem Führerschein vorqualifiziert sein und mindestens 21 Jahre alt sein.',
    ruleUnder25: 'Wenn der Fahrer unter 25 Jahre alt ist, können zusätzliche Gebühren anfallen.',
    ruleAlcohol: 'Es ist absolut VERBOTEN, dieses gemietete Fahrzeug von Personen zu benutzen, die unter dem Einfluss von ALKOHOL oder BETÄUBUNGSMITTELN stehen.',
    ruleNoSmoking: 'RAUCHEN ist im gemieteten Fahrzeug unter keinen Umständen erlaubt. Bei jedem Nachweis von Rauchen im Fahrzeug wird eine Geldstrafe erhoben.',
    ruleLostKeys: 'Im Falle von VERLORENEN, BESCHÄDIGTEN oder INNEN EINGESCHLOSSENEN SCHLÜSSELN kann eine Maximalgebühr anfallen.',
    rulePassengerCapacity: 'Die Passagierkapazität dieses Fahrzeugs wird durch die Anzahl der Sicherheitsgurte bestimmt und darf gesetzlich NICHT ÜBERSCHRITTEN werden.',
    ruleCleaningFee: 'Falls das Fahrzeug außergewöhnlich schmutzig zurückgegeben wird, kann eine REINIGUNGSGEBÜHR anfallen.',
    ruleTires: 'Platte oder beschädigte REIFEN liegen in der Verantwortung des Mieters.',
    ruleTickets: 'ALLE BUSSGELDER, STRAFEN während der Mietzeit müssen vom Mieter bezahlt werden.',
    rule24Hour: 'Miettage basieren auf 24-Stunden-Mietperioden. Jede Stunde nach der Mietperiode wird mit ¼ Tagesgebühr berechnet.',
    ruleNoCellPhone: 'Keine Handynutzung während des Fahrens, es sei denn Freisprechanlage.',
    ruleCardAuthorization: 'Ich autorisiere die Mietfirma, meine Karte zu belasten für alle anfallenden Gebühren.',
    ruleTermsAgreement: 'Ich habe die gelesen und stimme den zu',
    rentalTermsLink: 'Mietbedingungen',
    rentalTermsTitle: 'MIETBEDINGUNGEN',
    fullTermsNote: 'Für die vollständigen Bedingungen besuchen Sie bitte',
    signatureLabel: 'Ihre Unterschrift',
    signatureHelper: 'Bitte unterschreiben Sie im obigen Feld',
    clearSignature: 'Löschen',
    agreementTitle: 'Mietvertrag',
    agreementSubtitle: 'Bitte überprüfen und unterschreiben Sie den Mietvertrag',
    rentalSummary: 'Mietzusammenfassung',
    vehicle: 'Fahrzeug',
    pickupDate: 'Abholdatum',
    returnDate: 'Rückgabedatum',
    totalAmount: 'Gesamtbetrag',
    securityDeposit: 'Kaution',
    signatureRequired: 'Bitte geben Sie Ihre Unterschrift an',
    allConsentsRequired: 'Bitte markieren Sie alle Regeln um fortzufahren',
    customerInfo: 'KUNDE / HAUPTMIETER',
    additionalDriver: 'ZUSÄTZLICHER FAHRER',
    vehicleInfo: 'MIETFAHRZEUG',
    rentalPeriod: 'MIETPERIODE',
    fuelLevel: 'KRAFTSTOFFSTAND',
    rentalRates: 'MIETPREIS UND RECHNUNG',
    additionalCharges: 'ZUSÄTZLICHE GEBÜHREN',
    additionalServices: 'Zusätzliche Dienste',
    firstName: 'Vorname',
    middleName: 'Zweiter Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    driverLicense: 'Führerschein',
    state: 'Bundesland',
    licenseExp: 'Führerschein Abl.',
    dob: 'Geburtsdatum',
    address: 'Adresse',
    vehicleType: 'Fahrzeugtyp',
    makeModel: 'Marke/Modell',
    yearColorLicense: 'Jahr/Farbe/Kennz.',
    vin: 'FIN',
    odometer: 'Kilometerstand',
    startDate: 'Startdatum',
    startTime: 'Startzeit',
    dueDate: 'Fälligkeitsdatum',
    returnTime: 'Rückgabezeit',
    fuelPickup: 'Kraftstoff Abholung',
    fuelReturn: 'Kraftstoff Rückgabe',
    ratePerDay: 'Tagespreis',
    numberOfDays: 'Tage',
    dailyTotal: 'Tagesgesamt',
    ratePerWeek: 'Wochenpreis',
    numberOfWeeks: 'Wochen',
    weeklyTotal: 'Wochengesamt',
    surchargeTax: 'Zuschlagsteuer',
    pickupDropoff: 'Abholung/Abgabe',
    cdw: 'CDW',
    gps: 'GPS',
    childSeat: 'Kindersitz',
    driverUnder25Fee: 'Fahrer unter 25',
    additionalDriverFee: 'Zusatzfahrer',
    creditCardFee: 'Kartengebühr',
    subtotal: 'Zwischensumme',
    vehicleStateTax: 'Landessteuer',
    totalCharges: 'GESAMTKOSTEN',
    lateReturnFee: 'Verspätungsgebühr',
    damageFee: 'Schadensgebühr',
    fuelServiceFee: 'Kraftstoffgebühr',
    cleaningFee: 'Reinigungsgebühr',
    refund: 'Erstattung',
    balanceDue: 'OFFENER BETRAG',
  },
  fr: {
    rulesTitle: "RÈGLES D'ACTION",
    rulesSubtitle: '(voir aussi CGV)',
    ruleProhibitedDriver: "Il est absolument INTERDIT d'utiliser ce véhicule par toute personne non inscrite sur le contrat. Chaque conducteur doit avoir au moins 21 ans.",
    ruleUnder25: "Si le conducteur a moins de 25 ans, des frais supplémentaires peuvent s'appliquer.",
    ruleAlcohol: "Il est absolument INTERDIT de conduire sous l'influence d'ALCOOL ou de STUPÉFIANTS.",
    ruleNoSmoking: "Il est absolument INTERDIT de FUMER dans le véhicule. Toute preuve entraînera une amende.",
    ruleLostKeys: "En cas de CLÉS PERDUES ou ENFERMÉES, des frais maximum peuvent s'appliquer.",
    rulePassengerCapacity: "La capacité de passagers ne doit PAS être DÉPASSÉE. Attachez toujours votre ceinture.",
    ruleCleaningFee: "Si le véhicule est retourné sale, des FRAIS DE NETTOYAGE peuvent s'appliquer.",
    ruleTires: 'Les PNEUS crevés sont la responsabilité du Locataire.',
    ruleTickets: 'TOUTES LES AMENDES pendant la location doivent être payées par le Locataire.',
    rule24Hour: 'Les Jours de Location sont basés sur des Périodes de 24 heures. Chaque heure supplémentaire = ¼ du tarif journalier.',
    ruleNoCellPhone: "Pas de téléphone portable sauf kit mains libres. C'est la loi.",
    ruleCardAuthorization: "J'autorise la société de location à débiter ma carte pour tous les frais.",
    ruleTermsAgreement: "J'ai lu et j'accepte les",
    rentalTermsLink: 'Conditions de Location',
    rentalTermsTitle: 'CONDITIONS DE LOCATION',
    fullTermsNote: 'Pour les conditions complètes, veuillez visiter',
    signatureLabel: 'Votre Signature',
    signatureHelper: 'Veuillez signer dans la case ci-dessus',
    clearSignature: 'Effacer',
    agreementTitle: 'Contrat de Location',
    agreementSubtitle: 'Veuillez examiner et signer le contrat',
    rentalSummary: 'Résumé de la Location',
    vehicle: 'Véhicule',
    pickupDate: 'Date de Prise',
    returnDate: 'Date de Retour',
    totalAmount: 'Montant Total',
    securityDeposit: 'Dépôt de Garantie',
    signatureRequired: 'Veuillez fournir votre signature',
    allConsentsRequired: 'Veuillez cocher toutes les règles',
    customerInfo: 'CLIENT / LOCATAIRE PRINCIPAL',
    additionalDriver: 'CONDUCTEUR SUPPLÉMENTAIRE',
    vehicleInfo: 'VÉHICULE DE LOCATION',
    rentalPeriod: 'PÉRIODE DE LOCATION',
    fuelLevel: 'NIVEAU DE CARBURANT',
    rentalRates: 'TARIF ET FACTURE',
    additionalCharges: 'FRAIS SUPPLÉMENTAIRES',
    additionalServices: 'Services Supplémentaires',
    firstName: 'Prénom',
    middleName: 'Deuxième Prénom',
    lastName: 'Nom',
    email: 'E-mail',
    phone: 'Téléphone',
    driverLicense: 'Permis',
    state: 'Département',
    licenseExp: 'Exp. Permis',
    dob: 'Date de Naissance',
    address: 'Adresse',
    vehicleType: 'Type de Véhicule',
    makeModel: 'Marque/Modèle',
    yearColorLicense: 'Année/Couleur/Plaque',
    vin: 'VIN',
    odometer: 'Kilométrage',
    startDate: 'Date Début',
    startTime: 'Heure Début',
    dueDate: 'Date Échéance',
    returnTime: 'Heure Retour',
    fuelPickup: 'Carburant Départ',
    fuelReturn: 'Carburant Retour',
    ratePerDay: 'Tarif Jour',
    numberOfDays: 'Jours',
    dailyTotal: 'Total Jour',
    ratePerWeek: 'Tarif Semaine',
    numberOfWeeks: 'Semaines',
    weeklyTotal: 'Total Semaine',
    surchargeTax: 'Surcharge Taxe',
    pickupDropoff: 'Prise/Retour',
    cdw: 'CDW',
    gps: 'GPS',
    childSeat: 'Siège Enfant',
    driverUnder25Fee: 'Conducteur -25',
    additionalDriverFee: 'Conducteur Supp.',
    creditCardFee: 'Frais Carte',
    subtotal: 'Sous-total',
    vehicleStateTax: 'Taxe État',
    totalCharges: 'TOTAL',
    lateReturnFee: 'Frais Retard',
    damageFee: 'Frais Dommages',
    fuelServiceFee: 'Frais Carburant',
    cleaningFee: 'Frais Nettoyage',
    refund: 'Remboursement',
    balanceDue: 'SOLDE DÛ',
  },
};

// Get texts by language code
const getConsentTexts = (lang = 'en') => {
  const langCode = lang.toLowerCase().substring(0, 2);
  return RULES_TEXTS[langCode] || RULES_TEXTS.en;
};

// List of all rules that need to be checked
const RULE_KEYS = [
  'prohibitedDriver',
  'alcohol',
  'noSmoking',
  'lostKeys',
  'passengerCapacity',
  'cleaningFee',
  'tires',
  'tickets',
  'hour24',
  'noCellPhone',
  'cardAuthorization',
  'termsAgreement',
];

// Signature Pad Component
const SignaturePad = ({ onSignatureChange, signatureData, disabled }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (signatureData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = signatureData;
    }
  }, [signatureData]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`w-full h-32 border-2 rounded-lg bg-white touch-none ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 cursor-crosshair'
          } ${hasSignature ? 'border-green-500' : ''}`}
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
            <span className="text-sm">Sign here</span>
          </div>
        )}
      </div>
      {hasSignature && !disabled && (
        <button
          type="button"
          onClick={clearSignature}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      )}
    </div>
  );
};

// Rule Item Component - checkbox on the left, text on the right
const RuleCheckbox = ({ id, checked, onChange, text, addon, disabled }) => (
  <div className="border-b border-gray-200 py-3">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
      />
      <div className="flex-1 text-sm text-gray-700 leading-relaxed">
        {text}
        {addon && <span className="ml-1 text-gray-600">{addon}</span>}
      </div>
    </label>
  </div>
);

// Section Header Component
const SectionHeader = ({ title }) => (
  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
    <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wide">{title}</h4>
  </div>
);

// Info Row Component - always shows, even empty
const InfoRow = ({ label, value, className = '' }) => (
  <div className={`flex justify-between text-sm py-1 ${className}`}>
    <span className="text-gray-600">{label}:</span>
    <span className="font-medium text-gray-900">{value || '-'}</span>
  </div>
);

// ============== MAIN COMPONENT ==============

const RentalAgreementModal = ({
  isOpen,
  onClose,
  onConfirm,
  language = 'en',
  rentalInfo = {},
  formatPrice = (price) => `$${price?.toFixed(2) || '0.00'}`,
  consents = {},
  setConsents,
  signatureData = null,
  setSignatureData,
  loading = false,
  viewMode = false,
  agreementData = null,
  bookingId = null,
  t = (key, defaultValue) => defaultValue,
}) => {
  // State for PDF loading
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Get booking ID from props or nested data
  const resolvedBookingId = bookingId || rentalInfo?.bookingId || agreementData?.bookingId;

  // Handler to fetch and open rental agreement PDF (for existing bookings)
  const handleShowPdf = async () => {
    if (!resolvedBookingId) {
      setPdfError(t('admin.noBookingId', 'Booking ID not available'));
      return;
    }
    
    setPdfLoading(true);
    setPdfError(null);
    
    try {
      const response = await api.getRentalAgreement(resolvedBookingId);
      const agreement = response.data;
      
      if (agreement?.pdfUrl) {
        window.open(agreement.pdfUrl, '_blank', 'noopener,noreferrer');
      } else {
        setPdfError(t('admin.pdfNotAvailable', 'Rental agreement PDF is not available'));
      }
    } catch (err) {
      console.error('Error fetching rental agreement:', err);
      if (err.response?.status === 404) {
        setPdfError(t('admin.noAgreementFound', 'No rental agreement found'));
      } else {
        setPdfError(t('admin.errorFetchingAgreement', 'Error fetching rental agreement'));
      }
    } finally {
      setPdfLoading(false);
    }
  };

  // Handler to generate preview PDF (for new bookings)
  const handlePreviewPdf = async () => {
    setPdfLoading(true);
    setPdfError(null);
    
    try {
      const previewData = {
        language: language,
        customerName: `${rentalInfo?.renter?.firstName || ''} ${rentalInfo?.renter?.lastName || ''}`.trim() || 'Customer',
        customerEmail: rentalInfo?.renter?.email || '',
        customerPhone: rentalInfo?.renter?.phone || '',
        customerAddress: rentalInfo?.renter?.address || '',
        driverLicenseNumber: rentalInfo?.renter?.driverLicense || '',
        driverLicenseState: rentalInfo?.renter?.state || '',
        vehicleName: rentalInfo?.vehicle?.makeModel || rentalInfo?.vehicleName || 'Vehicle',
        vehiclePlate: rentalInfo?.vehicle?.yearColorLicense?.split('/').pop()?.trim() || '',
        pickupDate: rentalInfo?.dates?.pickup || rentalInfo?.pickupDate || new Date().toISOString(),
        pickupLocation: rentalInfo?.pickupLocation || '',
        returnDate: rentalInfo?.dates?.return || rentalInfo?.returnDate || new Date().toISOString(),
        returnLocation: rentalInfo?.returnLocation || '',
        rentalAmount: rentalInfo?.rates?.total || 0,
        depositAmount: rentalInfo?.rates?.securityDeposit || 0,
        currency: rentalInfo?.currency || 'USD',
      };

      const response = await api.previewAgreementPdf(previewData);
      
      // Create blob URL and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      console.error('Error generating preview PDF:', err);
      setPdfError(t('admin.errorGeneratingPreview', 'Error generating preview PDF'));
    } finally {
      setPdfLoading(false);
    }
  };

  const getInitialConsents = () => {
    const initial = {};
    RULE_KEYS.forEach(key => {
      initial[key] = consents[key] || false;
      initial[`${key}AcceptedAt`] = consents[`${key}AcceptedAt`] || null;
    });
    return initial;
  };

  const [localConsents, setLocalConsents] = useState(getInitialConsents());
  const [localSignature, setLocalSignature] = useState(signatureData);

  const texts = getConsentTexts(language);

  useEffect(() => {
    if (!viewMode) {
      const initial = {};
      RULE_KEYS.forEach(key => {
        initial[key] = consents[key] || false;
        initial[`${key}AcceptedAt`] = consents[`${key}AcceptedAt`] || null;
      });
      setLocalConsents(initial);
      setLocalSignature(signatureData);
    }
  }, [consents, signatureData, viewMode]);

  const getDisplayConsents = () => {
    if (viewMode && agreementData) {
      const display = {};
      RULE_KEYS.forEach(key => {
        display[key] = !!agreementData.consents?.[`${key}AcceptedAt`];
      });
      return display;
    }
    return localConsents;
  };

  const displayConsents = getDisplayConsents();

  const displaySignature = viewMode && agreementData?.signatureImage 
    ? agreementData.signatureImage 
    : localSignature;

  const handleConsentChange = (type, checked) => {
    if (viewMode) return;
    
    const now = checked ? new Date().toISOString() : null;
    const newConsents = {
      ...localConsents,
      [type]: checked,
      [`${type}AcceptedAt`]: now,
    };
    setLocalConsents(newConsents);
    if (setConsents) {
      setConsents(newConsents);
    }
  };

  const handleSignatureChange = (newSignature) => {
    if (viewMode) return;
    setLocalSignature(newSignature);
    if (setSignatureData) {
      setSignatureData(newSignature);
    }
  };

  const allConsentsAccepted = RULE_KEYS.every(key => displayConsents[key]);
  const canProceed = allConsentsAccepted && displaySignature;

  const handleConfirm = () => {
    if (viewMode) {
      onClose();
      return;
    }
    
    if (!canProceed) return;
    
    if (onConfirm) {
      onConfirm({
        signature: localSignature,
        consents: localConsents,
      });
    }
  };

  if (!isOpen) return null;

  // Helper to safely get nested values
  const renter = rentalInfo.renter || {};
  const additionalDriver = rentalInfo.additionalDriver || {};
  const vehicle = rentalInfo.vehicle || {};
  const rates = rentalInfo.rates || {};
  const additionalCharges = rentalInfo.additionalCharges || {};

  // Debug logging
  console.log('RentalAgreementModal rentalInfo:', rentalInfo);
  console.log('RentalAgreementModal rates:', rates);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={viewMode ? onClose : undefined} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('bookPage.agreementTitle', texts.agreementTitle)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {viewMode 
                ? t('bookPage.viewAgreement', 'View Rental Agreement')
                : t('bookPage.agreementSubtitle', texts.agreementSubtitle)
              }
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            disabled={loading}
            title={t('common.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Customer / Primary Renter */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.customerInfo} />
            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              <InfoRow label={texts.firstName} value={renter.firstName} />
              <InfoRow label={texts.middleName} value={renter.middleName} />
              <InfoRow label={texts.lastName} value={renter.lastName} />
              <InfoRow label={texts.email} value={renter.email} />
              <InfoRow label={texts.phone} value={renter.phone} />
              <InfoRow label={texts.driverLicense} value={renter.driverLicense} />
              <InfoRow label={texts.state} value={renter.state} />
              <InfoRow label={texts.licenseExp} value={renter.licenseExp} />
              <InfoRow label={texts.dob} value={renter.dob} />
              <div className="col-span-2 md:col-span-3">
                <InfoRow label={texts.address} value={renter.address} />
              </div>
            </div>
          </div>

          {/* Additional Driver */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.additionalDriver} />
            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              <InfoRow label={texts.firstName} value={additionalDriver.firstName} />
              <InfoRow label={texts.middleName} value={additionalDriver.middleName} />
              <InfoRow label={texts.lastName} value={additionalDriver.lastName} />
              <InfoRow label={texts.email} value={additionalDriver.email} />
              <InfoRow label={texts.phone} value={additionalDriver.phone} />
              <InfoRow label={texts.driverLicense} value={additionalDriver.driverLicense} />
              <InfoRow label={texts.state} value={additionalDriver.state} />
              <InfoRow label={texts.licenseExp} value={additionalDriver.licenseExp} />
              <InfoRow label={texts.dob} value={additionalDriver.dob} />
              <div className="col-span-2 md:col-span-3">
                <InfoRow label={texts.address} value={additionalDriver.address} />
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.vehicleInfo} />
            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              <InfoRow label={texts.vehicleType} value={vehicle.type} />
              <InfoRow label={texts.makeModel} value={vehicle.makeModel || rentalInfo.vehicleName} />
              <InfoRow label={texts.yearColorLicense} value={vehicle.yearColorLicense} />
              <InfoRow label={texts.vin} value={vehicle.vin} />
              <InfoRow label={texts.odometer} value={vehicle.odometer} />
            </div>
          </div>

          {/* Rental Period */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.rentalPeriod} />
            <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <InfoRow label={texts.startDate} value={rentalInfo.pickupDate || rentalInfo.startDate} />
              <InfoRow label={texts.startTime} value={rentalInfo.startTime} />
              <InfoRow label={texts.dueDate} value={rentalInfo.dueDate} />
              <InfoRow label={texts.returnDate} value={rentalInfo.returnDate || rentalInfo.endDate} />
              <InfoRow label={texts.returnTime} value={rentalInfo.returnTime} />
            </div>
          </div>

          {/* Fuel Level */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.fuelLevel} />
            <div className="p-3 grid grid-cols-2 gap-2">
              <InfoRow label={texts.fuelPickup} value={rentalInfo.fuelPickup} />
              <InfoRow label={texts.fuelReturn} value={rentalInfo.fuelReturn} />
            </div>
          </div>

          {/* Security Deposit */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.securityDeposit} />
            <div className="p-3">
              <InfoRow label={texts.securityDeposit} value={formatPrice(rentalInfo.securityDeposit || 0)} className="text-base font-semibold" />
            </div>
          </div>

          {/* Rental Rates / Invoice */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.rentalRates} />
            <div className="p-3 space-y-1">
              <InfoRow label={`${texts.ratePerDay} @ ${formatPrice(rates.ratePerDay || 0)}/day × ${rates.numberOfDays || 0} ${texts.numberOfDays}`} value={formatPrice(rates.dailyTotal || 0)} />
              {(rates.numberOfWeeks > 0 || rates.weeklyTotal > 0) && (
                <InfoRow label={`${texts.ratePerWeek} × ${rates.numberOfWeeks || 0} ${texts.numberOfWeeks}`} value={formatPrice(rates.weeklyTotal || 0)} />
              )}
              {rates.surchargeTax > 0 && (
                <InfoRow label={texts.surchargeTax} value={formatPrice(rates.surchargeTax)} />
              )}
              {rates.pickupDropoff > 0 && (
                <InfoRow label={texts.pickupDropoff} value={formatPrice(rates.pickupDropoff)} />
              )}
              {/* Selected Services - show only checked items */}
              {rentalInfo.selectedServices && rentalInfo.selectedServices.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <span className="text-xs text-gray-500 uppercase font-semibold">{texts.additionalServices}</span>
                  </div>
                  {rentalInfo.selectedServices.map((service, idx) => (
                    <InfoRow key={idx} label={service.name} value={formatPrice(service.price || 0)} />
                  ))}
                </>
              )}
              {rates.creditCardFee > 0 && (
                <InfoRow label={texts.creditCardFee} value={formatPrice(rates.creditCardFee)} />
              )}
              <InfoRow label={texts.subtotal} value={formatPrice(rates.subtotal || 0)} className="border-t border-gray-200 pt-2 mt-2" />
              {rates.vehicleStateTax > 0 && (
                <InfoRow label={texts.vehicleStateTax} value={formatPrice(rates.vehicleStateTax)} />
              )}
              <InfoRow 
                label={texts.totalCharges} 
                value={formatPrice(rentalInfo.totalAmount || rates.totalCharges || 0)} 
                className="border-t-2 border-gray-300 pt-2 mt-2 font-bold text-base" 
              />
            </div>
          </div>

          {/* Additional Charges */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.additionalCharges} />
            <div className="p-3 space-y-1">
              <InfoRow label={texts.lateReturnFee} value={formatPrice(additionalCharges.lateReturn || 0)} />
              <InfoRow label={texts.damageFee} value={formatPrice(additionalCharges.damage || 0)} />
              <InfoRow label={texts.fuelServiceFee} value={formatPrice(additionalCharges.fuelService || 0)} />
              <InfoRow label={texts.cleaningFee} value={formatPrice(additionalCharges.cleaning || 0)} />
              <InfoRow label={texts.refund} value={formatPrice(additionalCharges.refund || 0)} />
              <InfoRow 
                label={texts.balanceDue} 
                value={formatPrice(additionalCharges.balanceDue || 0)} 
                className="border-t-2 border-gray-300 pt-2 mt-2 font-bold text-base" 
              />
            </div>
          </div>

          {/* Rules of Action Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h4 className="font-bold text-gray-900">{texts.rulesTitle}</h4>
              <p className="text-sm text-gray-600">{texts.rulesSubtitle}</p>
            </div>
            
            <div className="px-4">
              <RuleCheckbox
                id="modal-rule-prohibitedDriver"
                checked={displayConsents.prohibitedDriver}
                onChange={(val) => handleConsentChange('prohibitedDriver', val)}
                text={texts.ruleProhibitedDriver}
                addon={texts.ruleUnder25}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-alcohol"
                checked={displayConsents.alcohol}
                onChange={(val) => handleConsentChange('alcohol', val)}
                text={texts.ruleAlcohol}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-noSmoking"
                checked={displayConsents.noSmoking}
                onChange={(val) => handleConsentChange('noSmoking', val)}
                text={texts.ruleNoSmoking}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-lostKeys"
                checked={displayConsents.lostKeys}
                onChange={(val) => handleConsentChange('lostKeys', val)}
                text={texts.ruleLostKeys}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-passengerCapacity"
                checked={displayConsents.passengerCapacity}
                onChange={(val) => handleConsentChange('passengerCapacity', val)}
                text={texts.rulePassengerCapacity}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-cleaningFee"
                checked={displayConsents.cleaningFee}
                onChange={(val) => handleConsentChange('cleaningFee', val)}
                text={texts.ruleCleaningFee}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-tires"
                checked={displayConsents.tires}
                onChange={(val) => handleConsentChange('tires', val)}
                text={texts.ruleTires}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-tickets"
                checked={displayConsents.tickets}
                onChange={(val) => handleConsentChange('tickets', val)}
                text={texts.ruleTickets}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-hour24"
                checked={displayConsents.hour24}
                onChange={(val) => handleConsentChange('hour24', val)}
                text={texts.rule24Hour}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-noCellPhone"
                checked={displayConsents.noCellPhone}
                onChange={(val) => handleConsentChange('noCellPhone', val)}
                text={texts.ruleNoCellPhone}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-cardAuthorization"
                checked={displayConsents.cardAuthorization}
                onChange={(val) => handleConsentChange('cardAuthorization', val)}
                text={texts.ruleCardAuthorization}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-termsAgreement"
                checked={displayConsents.termsAgreement}
                onChange={(val) => handleConsentChange('termsAgreement', val)}
                text={
                  <span>
                    {texts.ruleTermsAgreement}{' '}
                    <a 
                      href="/rental-terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {texts.rentalTermsLink}
                    </a>
                  </span>
                }
                disabled={loading || viewMode}
              />
            </div>
          </div>

          {/* Signature Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('bookPage.signatureLabel', texts.signatureLabel)} {!viewMode && '*'}
            </label>
            <SignaturePad
              signatureData={displaySignature}
              onSignatureChange={handleSignatureChange}
              disabled={loading || viewMode}
            />
            {!viewMode && (
              <p className="text-xs text-gray-500">
                {t('bookPage.signatureHelper', texts.signatureHelper)}
              </p>
            )}
          </div>

          {/* Rental Terms and Conditions Section - Hidden in modal, visible only in PDF/Print */}
          <div className="hidden print:block bg-white border border-gray-200 rounded-lg overflow-hidden mt-6 print:break-before-page">
            <SectionHeader title={texts.rentalTermsTitle} />
            <div className="p-4 space-y-4 text-xs text-gray-700 leading-relaxed">
              {/* Section 3 - Electronic Communications */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section3.title', '3. Electronic Communications and Telematics')}</h3>
                <p className="text-justify">{t('legal.terms.section3.para_a', '(a) You consent to receive electronic communications from us.')}</p>
                <p className="text-justify mt-1">{t('legal.terms.section3.para_b', '(b) The Car may have telematics, tracking, and related services.')}</p>
              </div>
              
              {/* Section 4 - Responsibility for Loss/Damage */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section4.title', '4. Responsibility for Loss of or Damage to the Car or its Equipment')}</h3>
                <p className="text-justify">{t('legal.terms.section4.para_a', '(a) You are responsible for all damage to or loss of the Car.')}</p>
                <p className="text-justify mt-1">{t('legal.terms.section4.para_b', '(b) Loss of use charges apply during repair period.')}</p>
              </div>
              
              {/* Section 5 - Prohibited Use */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section5.title', '5. Prohibited Use of the Car')}</h3>
                <p className="text-justify">{t('legal.terms.section5.intro', 'The Car shall not be used:')}</p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                  <li>{t('legal.terms.section5.prohibited1', 'By anyone not authorized')}</li>
                  <li>{t('legal.terms.section5.prohibited2', 'By anyone under influence of alcohol or drugs')}</li>
                  <li>{t('legal.terms.section5.prohibited3', 'For illegal purposes')}</li>
                  <li>{t('legal.terms.section5.prohibited4', 'To push or tow anything')}</li>
                  <li>{t('legal.terms.section5.prohibited5', 'In any race or competition')}</li>
                </ul>
              </div>
              
              {/* Section 6 - Payment of Charges */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section6.title', '6. Payment of Charges')}</h3>
                <p className="text-justify">{t('legal.terms.section6.para_a', '(a) You authorize us to charge your credit card for all charges.')}</p>
                <p className="text-justify mt-1 font-medium">{t('legal.terms.section6.para_b', '(b) A security deposit will be held on your card.')}</p>
              </div>
              
              {/* Section 7 - Computation of Charges */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section7.title', '7. Computation of Charges')}</h3>
                <p className="text-justify">{t('legal.terms.section7.time_charges', 'Time and mileage charges are computed from checkout to return.')}</p>
                <p className="text-justify mt-1 font-medium">{t('legal.terms.section7.toll_violations', 'Toll and violation charges plus administrative fees apply.')}</p>
              </div>
              
              {/* Section 8 - Refueling */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section8.title', '8. Refueling Options')}</h3>
                <p className="text-justify">{t('legal.terms.section8.intro', 'The following refueling options are available:')}</p>
              </div>
              
              {/* Section 9 - Arbitration */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section9.title', '9. Arbitration')}</h3>
                <p className="text-justify font-medium">{t('legal.terms.section9.text', 'Any dispute shall be resolved by binding arbitration.')}</p>
              </div>
              
              {/* Section 10-18 Abbreviated */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section10.title', '10. Responsibility for Property')}</h3>
                <p className="text-justify">{t('legal.terms.section10.text', 'We are not responsible for loss of personal property.')}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section11.title', '11. Liability Protection')}</h3>
                <p className="text-justify">{t('legal.terms.section11.para_a', 'Liability protection is provided as required by law.')}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section12.title', '12. Accidents')}</h3>
                <p className="text-justify">{t('legal.terms.section12.text', 'Report any accident to police and to us immediately.')}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section13.title', '13. Limits on Liability')}</h3>
                <p className="text-justify">{t('legal.terms.section13.text', 'Our liability is limited to the fullest extent permitted by law.')}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section14.title', '14. Privacy')}</h3>
                <p className="text-justify">{t('legal.terms.section14.text', 'Your information is handled according to our privacy policy.')}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{t('legal.terms.section15.title', '15. Governing Law')}</h3>
                <p className="text-justify">{t('legal.terms.section15.text', 'This agreement is governed by state law.')}</p>
              </div>
              
              <div className="pt-2 border-t border-gray-200 mt-2">
                <p className="text-center text-gray-500 italic text-xs">
                  {texts.fullTermsNote}{' '}
                  <a href="/rental-terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {window.location.origin}/rental-terms
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {!viewMode && (
            <>
              {!allConsentsAccepted && (
                <p className="text-sm text-amber-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  {t('bookPage.allConsentsRequired', texts.allConsentsRequired)}
                </p>
              )}
              {!displaySignature && (
                <p className="text-sm text-amber-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  {t('bookPage.signatureRequired', texts.signatureRequired)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex flex-col gap-3">
          {/* PDF Error Message */}
          {pdfError && (
            <p className="text-sm text-amber-600 text-center">{pdfError}</p>
          )}
          
          {/* Buttons Row */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              {viewMode ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
            </button>
            
            {/* Preview/Show PDF Button */}
            <button
              type="button"
              onClick={resolvedBookingId ? handleShowPdf : handlePreviewPdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {pdfLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  {resolvedBookingId 
                    ? t('admin.showAgreementPdf', 'Show PDF')
                    : t('admin.previewPdf', 'Preview PDF')
                  }
                </>
              )}
            </button>
            
            {!viewMode && (
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                  canProceed
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={loading || !canProceed}
              >
                {t('bookPage.confirmAgreement', 'Confirm & Continue')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalAgreementModal;
