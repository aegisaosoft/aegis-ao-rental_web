/*
 * Rental Agreement View Component
 * Core component for displaying rental agreement (PDF or form)
 * Used by RentalAgreementModal and RentalAgreementPage
 * Copyright (c) 2025 Alexander Orlov.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, Trash2, FileText, ExternalLink, Loader2, Download } from 'lucide-react';
import api from '../services/api';

// ============== TEXTS ==============
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
    ruleSmsConsent: 'I consent to receive SMS notifications and updates related to my rental.',
    rentalTermsLink: 'Rental Terms and Conditions',
    signatureLabel: 'Your Signature',
    signatureHelper: 'Please sign in the box above using your mouse or finger',
    clearSignature: 'Clear',
    agreementTitle: 'Rental Agreement',
    agreementSubtitle: 'Please review and sign the rental agreement',
    signedAgreement: 'Signed Rental Agreement',
    agreementAlreadySigned: 'This agreement has already been signed',
    openInNewTab: 'Open in New Tab',
    download: 'Download',
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
    returnDate: 'Return Date',
    returnTime: 'Return Time',
    fuelPickup: 'Fuel at Pickup',
    fuelReturn: 'Fuel at Return',
    ratePerDay: 'Rate per Day',
    numberOfDays: 'Days',
    securityDeposit: 'Security Deposit',
    subtotal: 'Subtotal',
    totalCharges: 'TOTAL CHARGES',
    loading: 'Loading...',
    loadingBooking: 'Loading booking data...',
    signAgreement: 'Sign Agreement',
    cancel: 'Cancel',
    close: 'Close',
  },
  es: {
    rulesTitle: 'REGLAS DE ACCIÓN',
    rulesSubtitle: '(ver también Términos y Condiciones)',
    ruleProhibitedDriver: 'Está absolutamente PROHIBIDO usar u operar este vehículo alquilado por cualquier persona que no figure en el contrato de alquiler. Cada conductor debe estar precalificado en persona con licencia de conducir válida y tener un mínimo de 21 años de edad.',
    ruleUnder25: 'Si el conductor es menor de 25 años, pueden aplicarse cargos adicionales.',
    ruleAlcohol: 'Está absolutamente PROHIBIDO usar u operar este vehículo alquilado por cualquier persona que esté bajo la influencia de ALCOHOL o cualquier NARCÓTICO.',
    ruleNoSmoking: 'Está absolutamente PROHIBIDO FUMAR en el vehículo alquilado bajo cualquier circunstancia. Cualquier evidencia encontrada de cualquier tipo de tabaquismo en el vehículo resultará en una multa independientemente del daño o no.',
    ruleLostKeys: 'En caso de LLAVES PERDIDAS, DAÑADAS o BLOQUEADAS DENTRO que requieran recuperación de llaves, puede aplicarse un cargo máximo.',
    rulePassengerCapacity: 'La capacidad de pasajeros de este vehículo está determinada por el número de cinturones de seguridad y, por ley, NO debe EXCEDERSE. Mientras esté en el vehículo, siempre abróchese el cinturón de seguridad. ¡Es la ley!',
    ruleCleaningFee: 'En caso de que el vehículo sea devuelto excepcionalmente sucio, puede aplicarse una TARIFA DE LIMPIEZA.',
    ruleTires: 'Los NEUMÁTICOS pinchados o dañados son responsabilidad del arrendatario y son la responsabilidad financiera del arrendatario o conductor(es) autorizado(s).',
    ruleTickets: 'TODAS LAS MULTAS, INFRACCIONES, CARGOS y otros recibidos durante el período de alquiler, causados como resultado del arrendatario y/o período de alquiler deben ser pagados por el arrendatario.',
    rule24Hour: 'Los días de alquiler se basan en períodos de alquiler de 24 horas. Por favor devuelva a tiempo. Cada hora después del período de alquiler se calculará como ¼ del cargo diario incluyendo todos los impuestos y cargos y hasta un día completo.',
    ruleNoCellPhone: 'No use el teléfono celular mientras opera el vehículo a menos que sea un dispositivo manos libres como Bluetooth. Es la ley, el conductor tiene prohibido manejar cualquier dispositivo electrónico mientras conduce independientemente del comportamiento de uso.',
    ruleCardAuthorization: 'Autorizo a la empresa de alquiler a cargar mi tarjeta de crédito/débito en archivo por: el monto del alquiler, depósito de seguridad, cargos de combustible si corresponde, violaciones de tráfico, multas de estacionamiento, cargos de peaje, reparaciones de daños, cargos de limpieza y cualquier otro cargo incurrido durante o como resultado de este alquiler.',
    ruleTermsAgreement: 'He leído y acepto los',
    ruleSmsConsent: 'Consiento recibir notificaciones SMS y actualizaciones relacionadas con mi alquiler.',
    rentalTermsLink: 'Términos y Condiciones de Alquiler',
    signatureLabel: 'Su Firma',
    signatureHelper: 'Por favor firme en el cuadro de arriba usando su ratón o dedo',
    clearSignature: 'Borrar',
    agreementTitle: 'Contrato de Alquiler',
    agreementSubtitle: 'Por favor revise y firme el contrato de alquiler',
    signedAgreement: 'Contrato de Alquiler Firmado',
    agreementAlreadySigned: 'Este contrato ya ha sido firmado',
    openInNewTab: 'Abrir en Nueva Pestaña',
    download: 'Descargar',
    customerInfo: 'CLIENTE / ARRENDATARIO PRINCIPAL',
    additionalDriver: 'CONDUCTOR ADICIONAL',
    vehicleInfo: 'VEHÍCULO DE ALQUILER',
    rentalPeriod: 'PERÍODO DE ALQUILER',
    fuelLevel: 'NIVEL DE COMBUSTIBLE',
    rentalRates: 'TARIFA DE ALQUILER Y FACTURA',
    additionalCharges: 'CARGOS ADICIONALES',
    additionalServices: 'Servicios Adicionales',
    firstName: 'Nombre',
    middleName: 'Segundo Nombre',
    lastName: 'Apellido',
    email: 'Correo Electrónico',
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
    startDate: 'Fecha de Inicio',
    startTime: 'Hora de Inicio',
    dueDate: 'Fecha de Vencimiento',
    returnDate: 'Fecha de Devolución',
    returnTime: 'Hora de Devolución',
    fuelPickup: 'Combustible al Recoger',
    fuelReturn: 'Combustible al Devolver',
    ratePerDay: 'Tarifa por Día',
    numberOfDays: 'Días',
    securityDeposit: 'Depósito de Seguridad',
    subtotal: 'Subtotal',
    totalCharges: 'CARGOS TOTALES',
    loading: 'Cargando...',
    loadingBooking: 'Cargando datos de reserva...',
    signAgreement: 'Firmar Contrato',
    cancel: 'Cancelar',
    close: 'Cerrar',
  },
  pt: {
    rulesTitle: 'REGRAS DE AÇÃO',
    rulesSubtitle: '(ver também Termos e Condições)',
    ruleProhibitedDriver: 'É absolutamente PROIBIDO usar ou operar este veículo alugado por qualquer pessoa não listada no contrato de locação. Cada motorista deve ser pré-qualificado pessoalmente com carteira de motorista válida e ter no mínimo 21 anos de idade.',
    ruleUnder25: 'Se o motorista tiver menos de 25 anos, taxas adicionais podem ser aplicadas.',
    ruleAlcohol: 'É absolutamente PROIBIDO usar ou operar este veículo alugado por qualquer pessoa que esteja sob a influência de ÁLCOOL ou qualquer NARCÓTICO.',
    ruleNoSmoking: 'É absolutamente PROIBIDO FUMAR no veículo alugado sob qualquer circunstância. Qualquer evidência encontrada de qualquer tipo de tabagismo no veículo resultará em multa independentemente de dano ou não.',
    ruleLostKeys: 'Em caso de CHAVES PERDIDAS, DANIFICADAS ou TRANCADAS DENTRO que exijam recuperação de chaves, uma taxa máxima pode ser aplicada.',
    rulePassengerCapacity: 'A capacidade de passageiros deste veículo é determinada pelo número de cintos de segurança e, por lei, NÃO deve ser EXCEDIDA. Enquanto estiver no veículo, sempre use o cinto de segurança. É a lei!',
    ruleCleaningFee: 'Caso o veículo seja devolvido excepcionalmente sujo, uma TAXA DE LIMPEZA pode ser aplicada.',
    ruleTires: 'PNEUS furados ou danificados são responsabilidade do locatário e são responsabilidade financeira do locatário ou motorista(s) autorizado(s).',
    ruleTickets: 'TODAS AS MULTAS, INFRAÇÕES, TAXAS e outros recebidos durante o período de locação, causados como resultado do locatário e/ou período de locação devem ser pagos pelo locatário.',
    rule24Hour: 'Os dias de locação são baseados em períodos de locação de 24 horas. Por favor devolva no horário correto. Cada hora após o período de locação será calculada como ¼ da diária incluindo todos os impostos e taxas e até um dia completo.',
    ruleNoCellPhone: 'Não use celular enquanto opera o veículo, a menos que seja um dispositivo viva-voz como Bluetooth. É a lei, o motorista está proibido de manusear qualquer dispositivo eletrônico enquanto dirige, independentemente do comportamento de uso.',
    ruleCardAuthorization: 'Autorizo a empresa de locação a cobrar meu cartão de crédito/débito em arquivo pelo: valor da locação, depósito de segurança, taxas de combustível se aplicável, violações de trânsito, multas de estacionamento, taxas de pedágio, reparos de danos, taxas de limpeza e quaisquer outros encargos incorridos durante ou como resultado desta locação.',
    ruleTermsAgreement: 'Li e concordo com os',
    ruleSmsConsent: 'Consinto em receber notificações SMS e atualizações relacionadas ao meu aluguel.',
    rentalTermsLink: 'Termos e Condições de Locação',
    signatureLabel: 'Sua Assinatura',
    signatureHelper: 'Por favor assine na caixa acima usando seu mouse ou dedo',
    clearSignature: 'Limpar',
    agreementTitle: 'Contrato de Locação',
    agreementSubtitle: 'Por favor revise e assine o contrato de locação',
    signedAgreement: 'Contrato de Locação Assinado',
    agreementAlreadySigned: 'Este contrato já foi assinado',
    openInNewTab: 'Abrir em Nova Aba',
    download: 'Baixar',
    customerInfo: 'CLIENTE / LOCATÁRIO PRINCIPAL',
    additionalDriver: 'MOTORISTA ADICIONAL',
    vehicleInfo: 'VEÍCULO DE LOCAÇÃO',
    rentalPeriod: 'PERÍODO DE LOCAÇÃO',
    fuelLevel: 'NÍVEL DE COMBUSTÍVEL',
    rentalRates: 'TARIFA DE LOCAÇÃO E FATURA',
    additionalCharges: 'ENCARGOS ADICIONAIS',
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
    vin: 'Chassi',
    odometer: 'Odômetro',
    startDate: 'Data de Início',
    startTime: 'Hora de Início',
    dueDate: 'Data de Vencimento',
    returnDate: 'Data de Devolução',
    returnTime: 'Hora de Devolução',
    fuelPickup: 'Combustível na Retirada',
    fuelReturn: 'Combustível na Devolução',
    ratePerDay: 'Diária',
    numberOfDays: 'Dias',
    securityDeposit: 'Depósito de Segurança',
    subtotal: 'Subtotal',
    totalCharges: 'TOTAL',
    loading: 'Carregando...',
    loadingBooking: 'Carregando dados da reserva...',
    signAgreement: 'Assinar Contrato',
    cancel: 'Cancelar',
    close: 'Fechar',
  },
  fr: {
    rulesTitle: 'RÈGLES D\'ACTION',
    rulesSubtitle: '(voir aussi les Conditions Générales)',
    ruleProhibitedDriver: 'Il est absolument INTERDIT d\'utiliser ou de conduire ce véhicule loué par toute personne non inscrite sur le contrat de location. Chaque conducteur doit être préqualifié en personne avec un permis de conduire valide et avoir au moins 21 ans.',
    ruleUnder25: 'Si le conducteur a moins de 25 ans, des frais supplémentaires peuvent s\'appliquer.',
    ruleAlcohol: 'Il est absolument INTERDIT d\'utiliser ou de conduire ce véhicule loué par toute personne sous l\'influence de l\'ALCOOL ou de tout NARCOTIQUE.',
    ruleNoSmoking: 'Il est absolument INTERDIT de FUMER dans le véhicule loué en toutes circonstances. Toute preuve de tabagisme dans le véhicule entraînera une amende, qu\'il y ait des dommages ou non.',
    ruleLostKeys: 'En cas de CLÉS PERDUES, ENDOMMAGÉES ou ENFERMÉES À L\'INTÉRIEUR nécessitant une récupération de clés, des frais maximum peuvent s\'appliquer.',
    rulePassengerCapacity: 'La capacité de passagers de ce véhicule est déterminée par le nombre de ceintures de sécurité et, selon la loi, ne doit PAS être DÉPASSÉE. Dans le véhicule, attachez toujours votre ceinture. C\'est la loi!',
    ruleCleaningFee: 'Si le véhicule est retourné exceptionnellement sale, des FRAIS DE NETTOYAGE peuvent s\'appliquer.',
    ruleTires: 'Les PNEUS crevés ou endommagés sont la responsabilité du locataire et sont à la charge financière du locataire ou du(des) conducteur(s) autorisé(s).',
    ruleTickets: 'TOUTES LES CONTRAVENTIONS, AMENDES, FRAIS et autres reçus pendant la période de location, causés par le locataire et/ou la période de location doivent être payés par le locataire.',
    rule24Hour: 'Les jours de location sont basés sur des périodes de 24 heures. Veuillez retourner à l\'heure. Chaque heure après la période de location sera calculée comme ¼ du tarif journalier, taxes et frais inclus, jusqu\'à une journée complète.',
    ruleNoCellPhone: 'Pas d\'utilisation du téléphone portable en conduisant le véhicule sauf s\'il s\'agit d\'un dispositif mains libres comme Bluetooth. C\'est la loi, le conducteur n\'a pas le droit de manipuler tout appareil électronique en conduisant.',
    ruleCardAuthorization: 'J\'autorise la société de location à débiter ma carte de crédit/débit enregistrée pour: le montant de la location, le dépôt de garantie, les frais de carburant le cas échéant, les infractions au code de la route, les contraventions de stationnement, les péages, les réparations, les frais de nettoyage et tous autres frais encourus pendant ou à la suite de cette location.',
    ruleTermsAgreement: 'J\'ai lu et j\'accepte les',
    ruleSmsConsent: 'Je consens à recevoir des notifications SMS et des mises à jour relatives à ma location.',
    rentalTermsLink: 'Conditions Générales de Location',
    signatureLabel: 'Votre Signature',
    signatureHelper: 'Veuillez signer dans le cadre ci-dessus avec votre souris ou votre doigt',
    clearSignature: 'Effacer',
    agreementTitle: 'Contrat de Location',
    agreementSubtitle: 'Veuillez examiner et signer le contrat de location',
    signedAgreement: 'Contrat de Location Signé',
    agreementAlreadySigned: 'Ce contrat a déjà été signé',
    openInNewTab: 'Ouvrir dans un Nouvel Onglet',
    download: 'Télécharger',
    customerInfo: 'CLIENT / LOCATAIRE PRINCIPAL',
    additionalDriver: 'CONDUCTEUR SUPPLÉMENTAIRE',
    vehicleInfo: 'VÉHICULE DE LOCATION',
    rentalPeriod: 'PÉRIODE DE LOCATION',
    fuelLevel: 'NIVEAU DE CARBURANT',
    rentalRates: 'TARIF DE LOCATION ET FACTURE',
    additionalCharges: 'FRAIS SUPPLÉMENTAIRES',
    additionalServices: 'Services Supplémentaires',
    firstName: 'Prénom',
    middleName: 'Deuxième Prénom',
    lastName: 'Nom',
    email: 'E-mail',
    phone: 'Téléphone',
    driverLicense: 'Permis',
    state: 'État',
    licenseExp: 'Exp. Permis',
    dob: 'Date de Naissance',
    address: 'Adresse',
    vehicleType: 'Type de Véhicule',
    makeModel: 'Marque/Modèle',
    yearColorLicense: 'Année/Couleur/Plaque',
    vin: 'NIV',
    odometer: 'Compteur',
    startDate: 'Date de Début',
    startTime: 'Heure de Début',
    dueDate: 'Date d\'Échéance',
    returnDate: 'Date de Retour',
    returnTime: 'Heure de Retour',
    fuelPickup: 'Carburant au Départ',
    fuelReturn: 'Carburant au Retour',
    ratePerDay: 'Tarif Journalier',
    numberOfDays: 'Jours',
    securityDeposit: 'Dépôt de Garantie',
    subtotal: 'Sous-total',
    totalCharges: 'TOTAL',
    loading: 'Chargement...',
    loadingBooking: 'Chargement des données de réservation...',
    signAgreement: 'Signer le Contrat',
    cancel: 'Annuler',
    close: 'Fermer',
  },
  de: {
    rulesTitle: 'VERHALTENSREGELN',
    rulesSubtitle: '(siehe auch Allgemeine Geschäftsbedingungen)',
    ruleProhibitedDriver: 'Es ist absolut VERBOTEN, dieses Mietfahrzeug von Personen benutzen oder fahren zu lassen, die nicht im Mietvertrag aufgeführt sind. Jeder Fahrer muss persönlich mit einem gültigen Führerschein vorqualifiziert sein und mindestens 21 Jahre alt sein.',
    ruleUnder25: 'Wenn der Fahrer unter 25 Jahre alt ist, können zusätzliche Gebühren anfallen.',
    ruleAlcohol: 'Es ist absolut VERBOTEN, dieses Mietfahrzeug von Personen benutzen oder fahren zu lassen, die unter dem Einfluss von ALKOHOL oder BETÄUBUNGSMITTELN stehen.',
    ruleNoSmoking: 'RAUCHEN ist im Mietfahrzeug unter allen Umständen absolut VERBOTEN. Bei Nachweis von Rauchen im Fahrzeug wird eine Geldstrafe erhoben, unabhängig davon, ob Schäden entstanden sind.',
    ruleLostKeys: 'Bei VERLORENEN, BESCHÄDIGTEN oder IM FAHRZEUG EINGESCHLOSSENEN SCHLÜSSELN, die eine Schlüsselbergung erfordern, kann eine maximale Gebühr anfallen.',
    rulePassengerCapacity: 'Die Passagierkapazität dieses Fahrzeugs wird durch die Anzahl der Sicherheitsgurte bestimmt und darf laut Gesetz NICHT ÜBERSCHRITTEN werden. Bitte schnallen Sie sich im Fahrzeug immer an. Es ist Gesetz!',
    ruleCleaningFee: 'Wenn das Fahrzeug außergewöhnlich schmutzig zurückgegeben wird, kann eine REINIGUNGSGEBÜHR anfallen.',
    ruleTires: 'Platte oder beschädigte REIFEN liegen in der Verantwortung des Mieters und sind die finanzielle Verantwortung des Mieters oder autorisierten Fahrer(s).',
    ruleTickets: 'ALLE STRAFZETTEL, BUSSGELDER, GEBÜHREN und andere, die während der Mietzeit anfallen und vom Mieter und/oder der Mietzeit verursacht wurden, müssen vom Mieter bezahlt werden.',
    rule24Hour: 'Miettage basieren auf 24-Stunden-Mietperioden. Bitte geben Sie rechtzeitig zurück. Jede Stunde nach der Mietperiode wird als ¼ der Tagesgebühr berechnet, einschließlich aller Steuern und Gebühren, bis zu einem vollen Tag.',
    ruleNoCellPhone: 'Keine Handynutzung während der Fahrt, es sei denn, es handelt sich um eine Freisprechanlage wie Bluetooth. Es ist Gesetz, der Fahrer darf während der Fahrt kein elektronisches Gerät bedienen.',
    ruleCardAuthorization: 'Ich ermächtige das Mietunternehmen, meine hinterlegte Kredit-/Debitkarte zu belasten für: Mietbetrag, Kaution, Kraftstoffgebühren falls zutreffend, Verkehrsverstöße, Parkgebühren, Mautgebühren, Schadensreparaturen, Reinigungsgebühren und alle anderen Kosten, die während oder infolge dieser Anmietung entstehen.',
    ruleTermsAgreement: 'Ich habe die folgenden gelesen und stimme zu',
    ruleSmsConsent: 'Ich stimme zu, SMS-Benachrichtigungen und Updates zu meiner Anmietung zu erhalten.',
    rentalTermsLink: 'Mietbedingungen',
    signatureLabel: 'Ihre Unterschrift',
    signatureHelper: 'Bitte unterschreiben Sie im obigen Feld mit Ihrer Maus oder Ihrem Finger',
    clearSignature: 'Löschen',
    agreementTitle: 'Mietvertrag',
    agreementSubtitle: 'Bitte überprüfen und unterschreiben Sie den Mietvertrag',
    signedAgreement: 'Unterschriebener Mietvertrag',
    agreementAlreadySigned: 'Dieser Vertrag wurde bereits unterschrieben',
    openInNewTab: 'In neuem Tab öffnen',
    download: 'Herunterladen',
    customerInfo: 'KUNDE / HAUPTMIETER',
    additionalDriver: 'ZUSÄTZLICHER FAHRER',
    vehicleInfo: 'MIETFAHRZEUG',
    rentalPeriod: 'MIETZEIT',
    fuelLevel: 'KRAFTSTOFFSTAND',
    rentalRates: 'MIETPREIS UND RECHNUNG',
    additionalCharges: 'ZUSÄTZLICHE GEBÜHREN',
    additionalServices: 'Zusätzliche Leistungen',
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
    yearColorLicense: 'Jahr/Farbe/Kennzeichen',
    vin: 'FIN',
    odometer: 'Kilometerstand',
    startDate: 'Startdatum',
    startTime: 'Startzeit',
    dueDate: 'Fälligkeitsdatum',
    returnDate: 'Rückgabedatum',
    returnTime: 'Rückgabezeit',
    fuelPickup: 'Kraftstoff bei Abholung',
    fuelReturn: 'Kraftstoff bei Rückgabe',
    ratePerDay: 'Tagespreis',
    numberOfDays: 'Tage',
    securityDeposit: 'Kaution',
    subtotal: 'Zwischensumme',
    totalCharges: 'GESAMTBETRAG',
    loading: 'Laden...',
    loadingBooking: 'Buchungsdaten werden geladen...',
    signAgreement: 'Vertrag unterschreiben',
    cancel: 'Abbrechen',
    close: 'Schließen',
  },
};

const RULE_KEYS = [
  'ruleProhibitedDriver',
  'ruleUnder25',
  'ruleAlcohol',
  'ruleNoSmoking',
  'ruleLostKeys',
  'rulePassengerCapacity',
  'ruleCleaningFee',
  'ruleTires',
  'ruleTickets',
  'rule24Hour',
  'ruleNoCellPhone',
  'ruleCardAuthorization',
  'ruleSmsConsent',
  'ruleTermsAgreement',
];

const getConsentTexts = (lang) => {
  const texts = RULES_TEXTS[lang] || RULES_TEXTS.en;
  return { ...RULES_TEXTS.en, ...texts };
};

// Format date string to readable format (removes T00:00:00 part)
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    // If it's already a simple date format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // Parse ISO date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
};

// ============== HELPER COMPONENTS ==============

const SectionHeader = ({ title }) => (
  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
  </div>
);

const InfoRow = ({ label, value, className = '' }) => (
  <div className={`flex justify-between text-sm py-1 ${className}`}>
    <span className="text-gray-600">{label}:</span>
    <span className="font-medium text-gray-900">{value || '-'}</span>
  </div>
);

const SignaturePad = ({ onSignatureChange, signatureData, disabled }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    // Guard against undefined or zero dimensions (e.g., in test environment)
    const width = rect?.width || 400;
    const height = rect?.height || 200;
    
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (signatureData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasSignature(true);
      };
      img.src = signatureData;
    }
  }, [signatureData]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const left = rect?.left || 0;
    const top = rect?.top || 0;
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - left,
        y: e.touches[0].clientY - top
      };
    }
    return {
      x: e.clientX - left,
      y: e.clientY - top
    };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (hasSignature && onSignatureChange) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`w-full h-32 border-2 rounded-lg bg-white ${disabled ? 'border-gray-200 cursor-not-allowed' : 'border-gray-300 cursor-crosshair'}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!disabled && hasSignature && (
        <button
          type="button"
          onClick={clearSignature}
          className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// ============== MAIN COMPONENT ==============

const RentalAgreementView = ({
  bookingId, // REQUIRED - data must always come from database
  // rentalInfo removed - data should always come from database
  language = 'en',
  onConfirm,
  onClose,
  formatPrice = (price) => `$${price?.toFixed(2) || '0.00'}`,
  viewMode = false,
  isPage = false, // true if used as standalone page
  t = (key, defaultValue) => defaultValue,
  // Props for signature and consents (external state management)
  signatureData,
  setSignatureData,
  consents,
  setConsents,
  loading,
  // agreementData removed - data should always come from database
}) => {
  // State
  const [pdfLoading, setPdfLoading] = useState(false);
  const [existingPdfUrl, setExistingPdfUrl] = useState(null);
  const [checkingExistingPdf, setCheckingExistingPdf] = useState(!!bookingId); // Only check if bookingId exists
  const [loadedBookingData, setLoadedBookingData] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  
  const checkedPdfRef = useRef(false);
  const loadedBookingRef = useRef(false);
  
  const texts = getConsentTexts(language);

  // State validation

  // Check if signed agreement PDF exists
  useEffect(() => {
    if (!bookingId || viewMode) {
      setCheckingExistingPdf(false);
      return;
    }
    
    if (checkedPdfRef.current) return;
    checkedPdfRef.current = true;
    
    setCheckingExistingPdf(true);
    
    api.getRentalAgreement(bookingId)
      .then(response => {
        const agreement = response?.data;
        if (agreement?.pdfUrl) {
          setExistingPdfUrl(agreement.pdfUrl);
        } else {
          setExistingPdfUrl('');
        }
      })
      .catch(err => {
        if (err?.response?.status === 404 || err?.response?.status === 401) {
          // 404: Agreement not found
          // 401: Unauthorized (also means agreement doesn't exist or user doesn't have access)
          setExistingPdfUrl('');
        } else {
          setExistingPdfUrl('');
        }
      })
      .finally(() => {
        setCheckingExistingPdf(false);
      });
  }, [bookingId, viewMode]);

  // Load booking data if PDF doesn't exist (only when bookingId exists)
  useEffect(() => {
    if (!bookingId || viewMode) return;
    if (existingPdfUrl === null) return; // Wait for PDF check
    if (existingPdfUrl) return; // PDF exists, no need to load
    if (loadedBookingRef.current) return;
    
    loadedBookingRef.current = true;
    setBookingLoading(true);
    
    api.getBooking(bookingId)
      .then(async (response) => {
        const booking = response.data;

        // Load customer with details (including license)
        let customer = null;
        let license = null;

        if (booking.customerId) {
          try {
            const customerDetailsResponse = await api.getCustomerWithDetails(booking.customerId);
            const customerDetails = customerDetailsResponse.data;

            customer = customerDetails.customer;
            license = customerDetails.license;


            // Extract customer and license data for agreement
          } catch (err) {
            console.error('Error loading customer details:', {
              status: err.response?.status,
              statusText: err.response?.statusText,
              message: err.message,
            });
          }
        }

        const pickupDate = booking.pickupDate ? new Date(booking.pickupDate) : new Date();
        const returnDate = booking.returnDate ? new Date(booking.returnDate) : new Date();
        const diffTime = Math.abs(returnDate - pickupDate);
        const rentalDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
        
        setLoadedBookingData({
          renter: {
            firstName: customer?.FirstName || customer?.firstName || booking.customerFirstName || '',
            lastName: customer?.LastName || customer?.lastName || booking.customerLastName || '',
            email: customer?.Email || customer?.email || booking.customerEmail || '',
            phone: customer?.Phone || customer?.phone || booking.customerPhone || '',
            middleName: license?.MiddleName || license?.middleName || '',
            dateOfBirth: customer?.DateOfBirth || customer?.dateOfBirth || license?.DateOfBirth || license?.dateOfBirth || '',
            address: customer?.Address || customer?.address || license?.LicenseAddress || license?.licenseAddress || booking.customerAddress || '',
            driverLicense: license?.LicenseNumber || license?.licenseNumber || '',
            state: license?.StateIssued || license?.stateIssued || '',
            licenseExpiration: license?.ExpirationDate || license?.expirationDate || '',
          },
          vehicle: {
            type: booking.vehicleCategory || '',
            makeModel: booking.vehicleName || `${booking.vehicleMake || ''} ${booking.vehicleModel || ''}`.trim(),
            yearColorLicense: [booking.vehicleYear, booking.vehicleColor, booking.vehiclePlate].filter(Boolean).join(' / '),
            vin: booking.vehicleVin || '',
          },
          pickupDate: booking.pickupDate,
          returnDate: booking.returnDate,
          startTime: booking.pickupTime,
          returnTime: booking.returnTime,
          rates: {
            dailyRate: booking.dailyRate || 0,
            ratePerDay: booking.dailyRate || 0,
            numberOfDays: rentalDays,
            dailyTotal: (booking.dailyRate || 0) * rentalDays,
            total: booking.totalAmount || 0,
            totalCharges: booking.totalAmount || 0,
            securityDeposit: booking.securityDeposit || 0,
            servicesTotal: booking.servicesTotal || booking.additionalFees || 0,
            subtotal: booking.subtotal || booking.totalAmount || 0,
          },
          totalAmount: booking.totalAmount || 0,
          securityDeposit: booking.securityDeposit || 0,
          selectedServices: (booking.services || []).map(s => ({
            name: s.name || s.serviceName || '',
            price: s.total || s.subtotal || 0,
          })),
        });

        // Agreement data loaded successfully
      })
      .catch(err => {
        setLoadedBookingData({});
      })
      .finally(() => {
        setBookingLoading(false);
      });
  }, [bookingId, viewMode, existingPdfUrl]);

  // Data validation - bookingId is required for database loading
  useEffect(() => {
    if (!bookingId) {
      setBookingError('Booking ID is required to load agreement data from database');
      return;
    }
  }, [bookingId]);

  // Local state for consents and signature if not provided via props
  const [localConsents, setLocalConsents] = useState(null);
  const [localSignature, setLocalSignature] = useState(null);

  // Use props or local state
  const effectiveConsents = consents || localConsents;
  const effectiveSetConsents = setConsents || setLocalConsents;
  const effectiveSignature = signatureData || localSignature;
  const effectiveSetSignature = setSignatureData || setLocalSignature;

  // Initialize consents
  useEffect(() => {
    if (viewMode || effectiveConsents) return; // Don't initialize if consents already exist
    const initial = {};
    RULE_KEYS.forEach(key => {
      initial[key] = false;
      initial[`${key}AcceptedAt`] = null;
    });
    if (setConsents) {
      setConsents(initial);
    } else {
      setLocalConsents(initial);
    }
  }, [viewMode, effectiveConsents, setConsents]);

  const handleConsentChange = (type, checked) => {
    if (viewMode || !effectiveSetConsents) {
      return;
    }
    const now = checked ? new Date().toISOString() : null;
    effectiveSetConsents(prev => ({
      ...prev,
      [type]: checked,
      [`${type}AcceptedAt`]: now,
    }));
  };

  const allConsentsAccepted = RULE_KEYS.every(key => effectiveConsents?.[key]);
  const canProceed = allConsentsAccepted && effectiveSignature;

  const handleConfirm = () => {
    if (viewMode || !canProceed) {
      return;
    }

    if (onConfirm) {
      onConfirm({
        signature: signatureData,
        consents: consents,
      });
    }
  };

  // Preview PDF
  const handlePreviewPdf = async () => {
    if (!loadedBookingData) return;
    
    setPdfLoading(true);
    // Removed: setPdfError(null) - no error display
    
    const info = loadedBookingData;
    
    try {
      const yearColorLicenseStr = info?.vehicle?.yearColorLicense || '';
      const yearColorLicense = yearColorLicenseStr.split('/').map(s => s.trim()).filter(Boolean);
      
      let vehicleYear = null;
      let vehicleColor = '';
      let vehiclePlate = '';
      
      if (yearColorLicense.length === 3) {
        vehicleYear = parseInt(yearColorLicense[0]) || null;
        vehicleColor = yearColorLicense[1];
        vehiclePlate = yearColorLicense[2];
      }

      const rentalDays = info?.rates?.numberOfDays || 1;
      const dailyRate = info?.rates?.ratePerDay || 0;
      const rentalAmount = info?.rates?.dailyTotal || (dailyRate * rentalDays);
      const depositAmount = info?.securityDeposit || info?.rates?.securityDeposit || 0;
      const additionalServices = (info?.selectedServices || []).map(s => ({
        name: s.name || '',
        dailyRate: s.price / rentalDays || 0,
        days: rentalDays,
        total: s.price || 0
      }));
      const totalCharges = info?.totalAmount || info?.rates?.totalCharges || 0;

      const previewData = {
        language: language,
        customerFirstName: info?.renter?.firstName || '',
        customerLastName: info?.renter?.lastName || '',
        customerName: `${info?.renter?.firstName || ''} ${info?.renter?.lastName || ''}`.trim() || 'Customer',
        customerEmail: info?.renter?.email || '',
        customerPhone: info?.renter?.phone || '',
        vehicleName: info?.vehicle?.makeModel || 'Vehicle',
        vehicleYear: vehicleYear,
        vehicleColor: vehicleColor,
        vehiclePlate: vehiclePlate,
        pickupDate: info?.pickupDate || new Date().toISOString(),
        pickupTime: info?.startTime || '',
        returnDate: info?.returnDate || new Date().toISOString(),
        returnTime: info?.returnTime || '',
        rentalDays: rentalDays,
        dailyRate: dailyRate,
        rentalAmount: rentalAmount,
        securityDeposit: depositAmount,
        additionalServices: additionalServices,
        totalCharges: totalCharges,
        // SMS Consent - Include by default with auto-generated text based on language
        includeSmsConsent: true,
        smsConsentText: null, // Will use auto-generated text based on language
      };

      const response = await api.previewAgreementPdf(previewData);
      
      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (err) {
      // Removed: setPdfError - error logged to console only
    } finally {
      setPdfLoading(false);
    }
  };

  // ============== RENDER ==============

  // Error state - no bookingId
  if (bookingError) {
    return (
      <div className={`flex items-center justify-center ${isPage ? 'min-h-screen bg-gray-100' : 'p-8'}`}>
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Loading Required</h3>
          <p className="text-gray-600 mb-4">{bookingError}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (checkingExistingPdf || bookingLoading) {
    return (
      <div className={`flex items-center justify-center ${isPage ? 'min-h-screen bg-gray-100' : 'p-8'}`}>
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{texts.loading}</p>
        </div>
      </div>
    );
  }

  // Show PDF if agreement exists
  if (existingPdfUrl) {
    return (
      <div className={`flex flex-col ${isPage ? 'min-h-screen bg-gray-100' : 'h-full overflow-hidden'}`}>
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {texts.signedAgreement}
            </h2>
            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
              <Check className="h-4 w-4" />
              {texts.agreementAlreadySigned}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={existingPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {texts.openInNewTab}
            </a>
            <a
              href={existingPdfUrl}
              download="rental-agreement.pdf"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              {texts.download}
            </a>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className={`flex-1 min-h-0 p-4 bg-gray-100 ${isPage ? '' : ''}`}>
          <iframe
            src={existingPdfUrl}
            className="w-full h-full rounded-lg border border-gray-300 bg-white"
            title="Rental Agreement"
          />
        </div>
        
        {/* Footer */}
        {onClose && (
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {texts.close}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show signing form
  const info = loadedBookingData || {};
  const renter = info.renter || {};
  const vehicle = info.vehicle || {};
  const rates = info.rates || {};

  return (
    <div className={`flex flex-col ${isPage ? 'min-h-screen bg-gray-100' : 'h-full overflow-hidden'}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">{texts.agreementTitle}</h2>
        <p className="text-sm text-gray-600 mt-1">{texts.agreementSubtitle}</p>
      </div>

      {/* Content - scrollable */}
      <div className={`flex-1 min-h-0 overflow-y-auto p-6 space-y-4 ${isPage ? 'max-w-4xl mx-auto w-full' : ''}`}>
        
        {/* Customer Info */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title={texts.customerInfo} />
          <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            <InfoRow label={texts.firstName} value={renter.firstName} />
            <InfoRow label={texts.middleName} value={renter.middleName} />
            <InfoRow label={texts.lastName} value={renter.lastName} />
            <InfoRow label={texts.email} value={renter.email} />
            <InfoRow label={texts.phone} value={renter.phone} />
            <InfoRow label={texts.driverLicense} value={renter.driverLicense} />
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title={texts.vehicleInfo} />
          <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            <InfoRow label={texts.vehicleType} value={vehicle.type} />
            <InfoRow label={texts.makeModel} value={vehicle.makeModel} />
            <InfoRow label={texts.yearColorLicense} value={vehicle.yearColorLicense} />
          </div>
        </div>

        {/* Rental Period */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title={texts.rentalPeriod} />
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <InfoRow label={texts.startDate} value={formatDate(info.pickupDate)} />
            <InfoRow label={texts.startTime} value={info.startTime} />
            <InfoRow label={texts.returnDate} value={formatDate(info.returnDate)} />
            <InfoRow label={texts.returnTime} value={info.returnTime} />
          </div>
        </div>

        {/* Security Deposit */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title={texts.securityDeposit} />
          <div className="p-3">
            <InfoRow label={texts.securityDeposit} value={formatPrice(info.securityDeposit || 0)} className="text-base font-semibold" />
          </div>
        </div>

        {/* Rental Rates */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title={texts.rentalRates} />
          <div className="p-3 space-y-1">
            <InfoRow label={`${texts.ratePerDay} @ ${formatPrice(rates.ratePerDay || 0)}/day × ${rates.numberOfDays || 0} ${texts.numberOfDays}`} value={formatPrice(rates.dailyTotal || 0)} />
            
            {info.selectedServices && info.selectedServices.length > 0 && (
              <>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-xs text-gray-500 uppercase font-semibold">{texts.additionalServices}</span>
                </div>
                {info.selectedServices.map((service, idx) => (
                  <InfoRow key={idx} label={service.name} value={formatPrice(service.price || 0)} />
                ))}
              </>
            )}
            
            <InfoRow label={texts.subtotal} value={formatPrice(rates.subtotal || 0)} className="border-t border-gray-200 pt-2 mt-2" />
            <InfoRow 
              label={texts.totalCharges} 
              value={formatPrice(info.totalAmount || rates.totalCharges || 0)} 
              className="border-t-2 border-gray-300 pt-2 mt-2 font-bold text-base" 
            />
          </div>
        </div>

        {/* Rules */}
        {!viewMode && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.rulesTitle} />
            <div className="p-4 space-y-3">
              {RULE_KEYS.map((key) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={effectiveConsents?.[key] || false}
                      onChange={(e) => handleConsentChange(key, e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      effectiveConsents?.[key]
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {effectiveConsents?.[key] && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    {key === 'ruleTermsAgreement' ? (
                      <>
                        {texts.ruleTermsAgreement}{' '}
                        <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                          {texts.rentalTermsLink}
                        </a>
                      </>
                    ) : (
                      texts[key]
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        {!viewMode && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <SectionHeader title={texts.signatureLabel} />
            <div className="p-4">
              <SignaturePad
                onSignatureChange={effectiveSetSignature}
                signatureData={effectiveSignature}
                disabled={viewMode}
              />
              <p className="text-xs text-gray-500 mt-2">{texts.signatureHelper}</p>
            </div>
          </div>
        )}

        {/* Removed: PDF error display - errors logged to console only */}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePreviewPdf}
          disabled={pdfLoading || !loadedBookingData}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Preview PDF
        </button>
        
        <div className="flex gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {texts.cancel}
            </button>
          )}
          {!viewMode && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {texts.signAgreement}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentalAgreementView;
