/**
 * Regression hashes of generated puzzles: for each (variant, level) combination the hash
 * of the puzzle that the pipeline gives for each of the 20 fixed seeds (see perf-helper.js).
 * GENERATED FILE - never edit by hand. Record the hashes of the current code on purpose
 * with
 *   node tests/perf.js --update-hashes
 * or SG_UPDATE_HASHES=1 node tests/node-runner.js --suite=perf
 * after a change that is meant to alter puzzles (a calibration, a new dig rule). A change
 * that must not alter them (an optimisation) leaves this file as it is: the suite "perf"
 * fails when a puzzle of a recorded (configuration, seed) pair differs.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  SG.fixtures.regression = {
    version: 1,
    seeds: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946],
    hashes: {
      'classic4/veryEasy': [
        'cfdf9052c826174e', '9c3830fae77b7fd6', '2d49259e3a97eb32', '546c1e997d9013fd',
        '728d910ad8a2c5c6', 'c8618eed83a0a299', '45e2eaf28bf1baae', 'e6b3415263cbafae',
        '334950b2bffd26ee', '87a5148ab00695e6', '27a541caf42a4846', '541f4a3aeaca8fb6',
        '0886c31a7d5c32d6', '3d654fba7c09d156', '810fb11be09d9ea7', 'b20f46f891a4305c',
        '903e95a48a750150', '482d8a5604ac756a', 'baa0db32101bb14e', 'e7b213f6e0eb4f0a'
      ],
      'classic4/easy': [
        'eb73ae1d85b6a3e9', '8e43b512ef57f8ce', 'e435e2fd89c97029', '2c789449b9d296cd',
        'fb61ef145411c2c0', '60e294e7cc9541cb', '77b5c7f4c4a73100', '31242a95a9fc3341',
        '38c04bd288c71ace', '6a50b2e10bbd0045', 'd83655019349fa05', 'cf6c0dda61d31cf6',
        'f858f550e43f6034', 'ff99feef87d62093', '07ddf7e80340530c', 'bc094f731bf41c9f',
        '8284e6614f787065', '36d0e1e860e5b2ec', '29dec63a1186f616', '42a7635b24bf58e7'
      ],
      'classic6/easy': [
        'cc2eff7f9158c3bb', '7e884dad225e4171', '7b0cf271bf433dbd', 'fec0f28f391f41eb',
        '45adee649d567570', '7d7798ab39f8e1bf', '85b771f70eede413', '44e06003e3a011d7',
        'a8589a84cbefd910', 'beaa0030ddcf6374', 'f56887d3727489e7', '22dc473edb4f79b2',
        '34e49123edd59017', '7435f7e95276caf5', '91f050ce36f5df62', '69d2346729d5a763',
        'b8d45e97ea087093', '67eab936f301daea', '3a6c369996c55c25', '5216ae2eb1f4fdc2'
      ],
      'classic9/veryEasy': [
        'b69ed95547eb4f09', '5fff9ba28713275e', '8c0e84aa5609f656', '54f5331c2b6491e0',
        'f48626d223c29afe', '0f9ba7a745f98063', 'd5e9b1f92f079e25', 'b09bcc6d7460b631',
        '2649061483eced78', '72865cb6c633457a', 'cceff5adb44f0021', 'c6aa405ccfee8280',
        'cbe34a75d8407079', '79aea134907ba578', '26d4792cee9c4670', 'cad2d96526214659',
        'd763b71e39a8e842', '34def9b0aad43b7c', '84a0fb3b1f761def', '0ddd320e8abd7072'
      ],
      'classic9/easy': [
        '26fc63f4821018c8', 'a1cd0e445194fb78', 'ca9de9a87d850f04', 'b176343d1a8836d1',
        'b2cc39ca3dcf8a86', '63edab3c2da8b020', '9cc956aa646736e6', 'a9b5fb073cd7dcc3',
        '636a1796170191fa', '3907efb455eb26a8', '3ec4cd14558299c8', '1a1be552437304de',
        '813ecd22b613971e', 'e8983841379bab3d', '13eaafbb49d9279f', '03b5ca58e5b95c44',
        '4d5f0d624ef6e7ce', '6bbd0d9edf38f862', 'd47d15756cbb4889', '2174c53b55fe380f'
      ],
      'classic9/medium': [
        '90917c1faa1673fb', '67ad1f99838356a5', '5ad312d42cd5bfa8', 'd43ba8483a0d1cc4',
        'bb2929b77c547d03', 'bde92055fe3872c9', '40e57ecf68ae552b', '80102b3a197e1666',
        '344f5121108da81d', 'e6cd636657f284ca', '09df440325129307', 'df3a0c94295568b8',
        '1412cefb0028b28f', 'e747f6e67b17a01a', '79a135faa67ad8f6', '648f3873f73d6d07',
        '397d106fd78e8c2b', 'd1df5045532dd9f9', 'fb58dceb00104c6f', '6af59eea05aec116'
      ],
      'classic9/hard': [
        'b4d5377e4f35fcb2', 'cef5122d939e1111', '7a9837af6ccfc94b', '8bb7c768de4bbf64',
        'c75c74b005789adc', 'ca9cc14c5dc55c10', '5f98ff276e8754c3', 'ca371b7ba252836f',
        'aed146eb93c91bcf', '900c5c6debc9b1d1', '0161d15062d1a3fc', '9b466df66bf2e27a',
        'f04b340171d2e9cd', 'bc4ecce8694be8b4', '7ee48974ccf6ac88', '6c71effefe7f0e52',
        'c7003f01522b157d', '4d872e514f3eec1d', 'b9093271a3c4952d', 'b277386afa20f9b6'
      ],
      'classic9/expert': [
        '4dfc28764a1d3dea', 'dc4ef2ec45bbd220', '53c9a276da3c4f0a', '56668355be433299',
        '594f00375f2c5983', '68ad4186a6c0557a', 'a4d6d901961fa4ed', '6ea5222856ee5204',
        'c700f04d2a817dc1', 'ecd86ac92cba8025', 'f04475340c39a098', 'd25107b7b47c5553',
        '43ea677c4a2d0c20', '8c78166ef994f3b2', '8685946bc9f9a7cf', 'bffa0aa96e571c55',
        'dc6a62fefce8b7b2', 'bc1a48f3ef6409f7', 'c6f51f9600cde1da', '812ab8578c487e93'
      ],
      'classic9/evil': [
        '86d1e172be618b9e', 'b8aa350cc06b5f60', 'affb7ad2abefaa8e', 'c8c897512443c1dd',
        '991c93a9ab3e9cd5', '12ef6c318fc0d53d', '0a74807f75b8a62b', '646eba3c17920bc0',
        '5f9749cb3f18552f', '5a5b1a4d758bde81', '0caa79518030700d', 'd98d375ef7a8a642',
        'cc867ed88510adf4', '5808eca53f2e9399', '668d170e087a5ac2', '7bf533d86663e5e4',
        '69b0ca23b360bb87', '948e79e5eae70329', '9f3bae9bcddae99f', 'feca37eef3969582'
      ],
      'mega12/medium': [
        '4e285b66bdeac40a', '2a3741a1e819f6ed', '9522b70063aaed0c', '8a0670d434adea88',
        '0ea30a5daf156269', '2fe3cd9ce0396f10', '5d19fd7e33a754d2', 'b6b57027d69d63a3',
        'fc16ecb791f79a43', 'a9a60276304c2ae2', 'ecd8bfc5dcb94cf9', '03e887da69e498d6',
        'd2fe4d89e5e7e2ed', '6a7dd06d31163a11', 'c5f7b99952fefa7d', 'e647f254026366a0',
        'a31efca87318f33c', 'ebd02a7fe3c0b9eb', 'f91aca407bcd3df4', 'de3a03c1c4af542d'
      ],
      'mega16/easy': [
        '231487dcbcdf7a58', 'bdf9a720060db434', '4987b917d9dbb3eb', '087155f48c391fd8',
        '6b6be6b256af60d6', '72f08912c652c136', '45963445cfab7cd1', '3528b51c0424d8a8',
        'c5fa9f5963996cb5', '384869026e17539e', '0d023290990ba084', '096bd8b2ca6687ce',
        'fc568c81122640d5', '68c6d7a1535ce03d', '6c0cb610a0b91f1c', '535e56d54f9e38a9',
        '8b64b51eaff48632', '8842f7466dd7bbd2', '72c4bda4044ed5e8', 'f20b51d1445426fd'
      ],
      'diagonalX/easy': [
        'ce9aae913829b0bd', '99616dad91b93b51', '64e124fbcb57135f', 'a6af5652acda493e',
        'a3d9d4700241e36c', '98ec6a1b478d486f', 'dafa68aa68c157c6', 'ef285f5c369f7630',
        'f369caed084b0ac1', '55815b930f7cb527', 'aca34a03419ac797', 'aeabb165e9480479',
        'f01e29fce66786e0', 'fc1a231307d14e77', 'c2228540cc25af4c', 'ad03cbaa9d8b2526',
        'b028b0784bc94f04', '0f700fa87b6b0994', '0d02e7637f201d77', '271ef033ab1b45d7'
      ],
      'diagonalX/evil': [
        '8712932f7797484b', 'e4a160acb6310680', 'e6996c2577bda799', '64a257d1feb503ad',
        '9e8e411b5335dd7f', '6b742b12bba40ade', '6d113e01da1d8b1d', '94bbeff64a92f37a',
        '762be3196bf56555', 'c27f3611f62df19d', 'f716d4cb0cf08c8f', '2a5bc97d645b9791',
        'a118eed969c92fe5', 'a3ee43260f2caa4a', '34956ff3caa2f367', 'b1c56bd45a331ab8',
        '2695d9e21fee3fee', '6239a03408042518', '04cc31d99a4cc415', 'bccdf0195ee7e795'
      ],
      'hyper/hard': [
        '5bb278ad78dffb51', 'ab72ce71d6416f8d', 'dae9c2a29f02ea8e', 'b51f6c1e48998692',
        '3e087fb41c5d3578', '137cb942d22808fe', '03fd4395d92a8869', '411c09a442808518',
        'f5193caea4b3b5c2', 'c5340d6e3ff5be02', 'd31bc673a99d6807', 'aa0aa3685d839c34',
        'd98fdbcdfb254321', 'a18958ef1e04fafb', 'ca25d237f7409ed3', '8cecafcb11086f5f',
        'e898eed1a032749d', 'c4a9c095770aebd9', '2292b436fbba257a', 'a77d1299eb09ef15'
      ],
      'jigsaw9/medium': [
        '85b65ec56d9305a9', '7a88cdbe19e73932', '045f8cbda6196491', '65805180f46a103c',
        '144649e1b661512d', 'a64947dace6cc4a6', '15d5ea1b5cbe325f', '078fc9c52ed96b89',
        '3b11c3a2282ebebe', '42e2d772d872603e', 'b0020580449bab6c', 'f730f03b6d16f51f',
        '1fccf940b4e7182c', 'bd0091401124872c', '2d95fb4524e6b099', 'cfa6ebdc276be500',
        '80fcec2ae91a39d6', '09af19ffbd66f0fb', 'fd253180d0877e1c', 'cf8f018029c0661c'
      ],
      'jigsaw9/expert': [
        'f1c12072289e067e', 'b75b1db174119c2d', '03a69017960c7513', '973dd2d3a432e577',
        '35bb8f50120a10cc', '5004f0678c0f7423', 'd670213e94a78712', '45a0374ae35a2ca6',
        '935793a1a0dedb2d', 'ff3e98ae68d56e82', '883af903cb751a47', 'fc730f2fcd0201bb',
        'a70ceb5bac0e5cbf', '784d7382a5490dfe', '116d825b4f42ea6f', '2c0138a050a71cac',
        '904d6c4da5533dc1', 'fafe5e28e6ad1f44', 'fcfdb65008c53e2c', '4ad3d7c2ecab052e'
      ],
      'killer/easy': [
        'dd3492ba2e66dcf6', 'bee59d09f8506a95', '7eadbb14a7278fc8', 'c3ba1e17424c2a23',
        'd86320f28eb74d1e', '1a5a0e553aa8c719', '04caea579ca26993', '3f8b98a55ac3bde9',
        'bf20636a0d69d716', 'b59c06a73ec1185b', '0b8702c935378e4d', '605e55653d1f3b71',
        '7253e7a2dcef67ce', 'caf07a496ec6a475', '7c4630b2de74b4ae', 'bfa8cd396f127485',
        '65f66e2207eebbee', 'd6ed7b09f568a9dd', 'e64fb4904b33d574', '7a221dfdd92d0131'
      ],
      'killer/hard': [
        '54e132db5d25946f', 'd5abb7f9462b6e2d', '8f09a8fc986f4168', '8b9cdc928f91a706',
        'b33043c9c40e8f65', 'd8ab49e9dea10315', '910dd7a96f77fe35', '00761180a93093ac',
        'f2531da7ad45c1bb', 'a23cfdb5809e9cd1', 'ee4b57399edf80dd', '781145c38e6e9997',
        'af9d4491752f6f7d', 'c69f86e299de1ed6', 'da8368b6a32a1b32', 'dffd9e934b67caaf',
        '542b2dc892e8d9f4', 'c0fc947635ad2752', 'fb04e8878a99c9eb', 'c3b45466f7a08b5a'
      ],
      'greaterThan/medium': [
        'ab92019329cf1bbf', 'c67216d091721d2c', '56808189b0657bf5', '46d9fe5b4ea8e5af',
        '0438317d8609d639', 'd75d790e66c3706a', 'bb06ca80cd4622cc', '7e794c38265eb624',
        'b1a7d96720db4533', 'd9487d17f85dce53', '0e1dca57df81892b', '11853a4ecfe31552',
        '11a77228d2a48f54', '6ec071e025ab0534', '0ca6210c0d2f5ba8', '035b921574918611',
        'ba70cb4ba7597237', 'bed41ef541cfc591', '39966167120d3dab', 'aced750a3b404a46'
      ],
      'greaterThan/hard': [
        '40cc1d8c93e33c78', 'df625df73c728f33', 'a70691f3a8551b8f', '130b8801def3c055',
        '1dddb096f615337a', 'c73911abe3251aaf', 'fdc11d9504ad9159', '81b7c07e8efcdfb2',
        '9609a1fac2ee5036', '9a0f32b9d61236bd', 'ed316e19920f37bd', '9510f0d1d43a0ac5',
        '450ecd10f2f32dac', '92946436ec6564f2', '93276ed922c2936d', '3640fc33c02437bf',
        '14e1b2dbb666b917', '95d2e231ac881b7d', '6aaf792ceaf06ce8', '1c810578e5b82bac'
      ],
      'samurai/easy': [
        '3e2e4bb5a1e046b9', '534a11ad743d8251', '83fa5c7606e4524a', '0ed7b567cd27e72b',
        '256916c6c32a773a', '0d74af2f968b9e03', 'b78d850b0a6abef7', '64419bbfd89efd13',
        'c6a74d035681949f', 'd3401844a0e75850', '91ce590ba89e7f47', '78ab3cd09701b6b4',
        'e6c1069115736f2d', '3a82263e7532b9b2', '87f0a233ba97a4ef', '12450c97bdae874b',
        'c2dc7ca8c976ab5c', 'aea0e3a0fa659be4', 'aafe64cd32effda1', 'ddf976dd4b0d1ff1'
      ],
      'sohei/veryEasy': [
        '00c9af0fd9c3ce1b', '1d9d4b34c40000e0', '7c1b372fa226361b', 'e3ad163500ddce01',
        '9a2b2977894afe83', 'ed0db9ed9c8d97b9', '2c395d476de13763', 'a64299f8182a43bc',
        'f9b319c52d0e1101', '777652ae7e3e59c2', 'ec6723caad71e416', '3b70070de85e4699',
        'efa799c4439428c0', '270aff222d4752ce', '792d00e472c764d0', 'ab6193f34a466357',
        '353fa8d2bac8f59e', 'bcd0a5b425dbedb0', '72238c9311333c37', 'b58a2e2983cbfcdd'
      ],
      'butterfly/medium': [
        'd1b87dc9a6c97575', '005e9ece45bae49a', '0a431cb78863a043', '42f2f285f36046e9',
        '01e5caba3a559c7e', '0f11ff303690ca24', 'cb3b2dbc580d5ba8', 'ec4aa380009ada04',
        '1add405145f4dd0d', '95c0873f6bdf989b', '2a60f17b8c94194f', '62748f556d263759',
        'd2bc817922485025', 'c88714c3ddf3a767', '63ba0bb96373c3e5', '09cbf5be0e7e869a',
        'e547d86cb30d64e8', '4f6c881cf45921f8', '902943c5cfccc369', '1fd35b6efb58f7ca'
      ],
      'flower/medium': [
        '3535ea51099c882d', '37366c409e9c9f14', 'cd278e6b92eb240f', '967bf02d6d244871',
        '1a84f24152cd17cd', '529f501e9528a942', '659f1544e3f18290', '50483ab45a8a2fe0',
        'bb379b1256cad96e', 'dbaab7569779f46a', '4a9ba62013bba5b4', 'a4bd5c0e57ebede2',
        '127b4284da53d3c0', '516696782b8e4bfc', '113053a424388f00', '1bca9d57423ef043',
        '86f7f33bac3f7d8f', '87f4bbff3a9085fb', 'f310849b45c0bdcf', '99d33533d8b4f377'
      ],
      'wordoku/medium': [
        '5dcf9d411744fc1d', '84c18ad36aa77cf7', '7153b073eb0c5baf', '18dab98526d745c1',
        '06481465674f2079', '14cf7ce267aa1686', 'ee478cb41a4f7e58', 'fece246665d97f82',
        'a4bc2f020312b52e', 'ed25f32504bcb849', 'a5d95021c3320665', '099586533a37376f',
        'e3ceb1478406184b', '3a876ea2cdab765e', 'f41fe3554193f139', '7b5d96b0e0ddedb4',
        '9bd86cc4381884b0', '166ca9eb6a57cd2f', '47b4af9f8d81dd93', '803cf278820ca4a4'
      ]
    }
  };
})();
