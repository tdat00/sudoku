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
      'classic6/veryEasy': [
        '2b6c9237e264b873', '6cc0e600ecf21184', 'd13f73833c4da377', 'cc057218e9ffb4dc',
        '9f5cb7793a7ff7a5', '789beba1f0dfde4d', 'e158c5100f8688d4', 'db1f065336f228c7',
        '3faec6a84cc6fd2c', '59ac945d0fff1ea1', 'e246c10eabe168c2', 'eab9642a661ecf06',
        '7c7655a4f6f334f0', '97e5b11758f02eb3', 'ea56fe0e290cc0a2', '6839c951ed87ee3d',
        'c9b16100419f04a4', 'b6d3f29fc6bb16fb', '7c640031339f6fbd', '5184466bdf0eb93f'
      ],
      'classic6/hard': [
        '574474311da5e1bd', 'ebf80364c8038d30', 'deebe99ca53c1b08', '16699f94c0182fc0',
        'f04dcdb2a7033d2e', '0417bf9be8da844f', '3934a44d0a2ebb31', '06fc4cfa991c1e56',
        '41782667eea6f043', '704b503d56ad1e41', 'b8f358daf51c2836', '33ef8b3c6916a3a8',
        'cc36183ecfa63652', 'b80a9a434f75e457', '1f3b5c169454b6ca', '86176e23cf286857',
        '15e21332252d6f6e', '0be944fd5d3fe141', 'd7355e2086317a44', '75d11c203891e284'
      ],
      'classic9/veryEasy': [
        'b69ed95547eb4f09', '5fff9ba28713275e', '8c0e84aa5609f656', '54f5331c2b6491e0',
        'f48626d223c29afe', '0f9ba7a745f98063', 'd5e9b1f92f079e25', 'b09bcc6d7460b631',
        '2649061483eced78', '72865cb6c633457a', 'cceff5adb44f0021', 'c6aa405ccfee8280',
        'cbe34a75d8407079', '79aea134907ba578', '26d4792cee9c4670', 'cad2d96526214659',
        'd763b71e39a8e842', '34def9b0aad43b7c', '84a0fb3b1f761def', '0ddd320e8abd7072'
      ],
      'classic9/easy': [
        'e2ce566bd00c8c3f', 'fafba5a8e143fd44', '8959b8e643580e6a', '6d8f07fc900961b0',
        'fa7bfeb87e254df4', '5c05f1a9dee1bca5', 'ea1cbf3bfe42c04f', 'c045be10b6171c5c',
        'de5413e48b2a88e8', 'a06ba3d191e1477d', '8f8a97b8ebc20ff4', '2f0c5db4f485b718',
        'e3de19938dd3fc87', '2c8cb791d7fbc2bd', '3865e7e9a3e498d5', '7dd3dc515f1013dd',
        '3dc9f1a0f33870dc', 'a58c732983c19635', '1dc0f4ddf353bd91', '49a981108a82d77c'
      ],
      'classic9/normal': [
        '643c9fdcc775c3a0', '9552a3d1084b7fbd', '6a5c3fd3df1aa547', 'ab91cd66e61f4b4a',
        '2d7e809fca8133bb', '02274b8f8570a9db', '7f6eef1f06f46c8b', 'fec22b176a036943',
        '344f5121108da81d', '6921fe9591ab28d9', '3642cc4b5f9aceaf', '6d6b38345497a8c8',
        '2179010bc7bb4d1f', 'd8f7bcfbf671fc2f', '2eece18b3a87671f', '648f3873f73d6d07',
        'b1739303807c9187', 'e1f6061474401c98', 'ad8d2fe6cc79984a', '6edd5d08ac044c24'
      ],
      'classic9/hard': [
        '40fdd3618f9fe1cd', '5211afb6f6e0578a', '7a9837af6ccfc94b', 'dce72ce6a0b55cea',
        '21ba4978178fe9c4', '919703384cdfbde4', '26eafd827e56e3fe', '096ffc3e88311212',
        'aed146eb93c91bcf', 'b0bfcec37b2e2097', 'fb1e5811a4a5944d', '7756b11cb6f69b30',
        'f04b340171d2e9cd', '8c6c3e4a8a1dd866', '8685946bc9f9a7cf', '3004c2f206b511ce',
        'e12c4467721b7213', 'd68d25a60ffe38ea', '25e8f2abf906d05f', 'b277386afa20f9b6'
      ],
      'classic9/expert': [
        'cf5f01b2e3df218e', '63335b832060f687', 'd4c73053838ab967', 'aa605316ef7fdcda',
        'dfc2f27edb889022', '98678781ced00fad', 'a4d6d901961fa4ed', '7cfeb5c04370f9ec',
        '3f51f20c1eff1a10', '2b24125181b5be0d', '8d70a6b459b91bc8', '063cef13bd709f07',
        'e6b3e77ad6e0d956', '1ce384f24682d10e', '63fa5afc801f28f0', '608b89563e6deaea',
        '9b72e4ea0444d336', '99364360081d05bc', 'd230944fcb0b146b', 'd524902c9924d020'
      ],
      'classic9/master': [
        '8accb2b21860029e', '1e7617daded7a8a6', '828e9388f03284b4', 'a870dde016bcfc6c',
        '0114fb0cf1cede10', 'a6974c0c61e61d80', '0a74807f75b8a62b', 'c4261f0e59b00482',
        'e2b21c3a51c55c76', '5a5b1a4d758bde81', 'da379b3467a048b8', '790437da17a235f6',
        '11ee29190ad828f5', 'd642d621986b65fd', 'a1e70ea13ee80f3d', 'e2b78540b64df61c',
        '40fb1b94a17744c8', 'c2fd8ddd43df8a51', '29347bf7614c9de3', '0653c5d7dc8f5133'
      ],
      'classic9/nightmare': [
        '86d1e172be618b9e', 'b2617ee032a4016c', '03c94c54f91828d8', '486e7c2ec5568382',
        '345c0e526057fe6e', '12ef6c318fc0d53d', 'b1f7b262d7cb10ce', 'e6a777410136194d',
        '4164e7fe5f7fe0e2', '70b4d50356265307', '0caa79518030700d', '5b51d9e075f3fe7c',
        'b457b0449e9a0ee8', '71afbd6714c77a53', 'd21fee25b9491269', '1e3ed1b29371764e',
        'cb7becbd47a0eeb1', '333527f37c599ca7', '9f3bae9bcddae99f', '7e5d71552b14f449'
      ],
      'mega12/normal': [
        '55a229f28ad96406', '880378cbd0717e4f', '8db24fe4df2928a0', '0b285e5e4c290fba',
        '4877d77867cbd61c', '43ed6690ac7c348c', '5d19fd7e33a754d2', 'bf726af92696d3ed',
        '7296fb88ff909bd4', '4fee7e84461263e8', 'ecd8bfc5dcb94cf9', '28adbaa28171fd1e',
        '646f5e28be7acadc', '37c7d0c09e7f752c', '8f17f98427760d28', '289dd101d95a4e45',
        'b690724544e18d81', 'e6bcb4575bc90c83', '8ff5b6bff8fa80e3', '02d858c78647c28b'
      ],
      'mega16/easy': [
        'bff22de04d4777ec', 'dcfc1daa8f223f96', 'c9ca37ee0aaea1fa', '8df84658edbf6d6c',
        'ebdf4d34eb202b28', 'f777c5251cc36899', '1825941a70d2c3ae', '4ddc7b6e1fab3392',
        'd82ae1d63d2ea79a', '20da2293501deb07', '4e3cb2dc742cede8', 'a2011a797857eadd',
        '036411f522dc5089', '8d61b25e0438a6da', '6d00003c7625da48', '27b951cc96a54830',
        '27ca9ff737bbb6db', '36a08aabc4a1278f', '9d5ba3be31fbd642', '7e492356c226b632'
      ],
      'diagonalX/easy': [
        '396ea62f4817029b', '9812f460a4a9e68c', '825ad7840cbd1898', 'ed2fd97eda3a5b52',
        '02ba92967704260a', '4fc5878d57bebaf1', '54b6489b4660dcdf', '0baa86d2fbf343de',
        '3369c38bed0e84ef', '501da57375fa05e7', '1a3e16ada8ed3501', 'b0084dc6d5458d1a',
        '8b4274b85cb3f894', '1f0dae37e531e613', '174c94265082505a', '18c13b85be101b29',
        'a5f3bf82e14e277e', '1767bcf67e10a03a', 'd5f4aeb7c4373de3', 'f73ba3061687a80a'
      ],
      'diagonalX/nightmare': [
        'ea40905da715ad21', 'e146de8f5fc95aeb', 'edfaf735dcebeb69', '5b8f8f4f3a25a82b',
        'c839250807e79d14', '863dc6f9375bbf65', '1d28c004e14b95d8', 'd3b88366b7c46bea',
        '63a1c2db8206c8cf', 'ff322e5397ad25a7', '814f6a3a42d808d6', '0086fe024b32105e',
        '9107519cffd51390', '51d9d3e0d8c2b83c', '11904526120cfa2a', '12f1c00854df16d4',
        '516f83d6cce4f70a', '0f0c344b15c945af', '3ca158c81c755da4', '4d80a44cf03bb140'
      ],
      'hyper/hard': [
        '7be06221d5c2e4bd', 'bc3d5e35d5c2eaf9', 'b2f1ed93f656de47', 'f4457e2498810bd8',
        '38bb427a649bcf36', '731324bc439c8ec0', 'ad0e45226c19df8e', '37dde883ba486aa7',
        '80b5ed097bc24345', '4c0e5a9a9d05a2d6', 'f74c25726f17805e', '5c4451eab2778e46',
        '21528e4cf2bfde80', '01166d2b0fe03daf', '2c09a432d0ecf77e', 'a866ecbffbfee9cb',
        '058337e6a87c18ea', '7a89449a7dd91316', '9c6e3e5385b7e8c7', '5a740a58f4fea224'
      ],
      'jigsaw9/normal': [
        '78baffe0dd6deacc', '6735049e02d6c682', '6e3f276349ae5557', '5fdb990b0a55114f',
        '144649e1b661512d', '30889bb5698b50d9', 'c3b52dc57dfc2ca9', '3021756515303589',
        'ec1b07ec6d351380', 'de8e0f60d17b0e0c', '3dfad3feb68e1702', '14a1a28d92c4f931',
        'a503ec29aed16c35', '55bbc11b89197faf', 'ac82ffd4783b28e8', 'cff30bc307613037',
        'ae439792713099ee', '163d9ba930b4ce45', 'c0509e5c0305e4b0', 'fc4bc58f6bbb6cab'
      ],
      'jigsaw9/master': [
        '00a9e7462afbf6ba', '287cd2ac64315cf0', '6e2dad9b04ab999f', 'e059108b7a7ccdcf',
        '2aded89003eb0a0c', '70659a9abd93f086', '0d19c96ea5b72092', 'e18289dd14356fb1',
        '6cc89676da6e170a', '36a629c3bd008167', 'efa269229ffe7f8e', '1f33856b569e669f',
        'bd965481775cd63d', '8e97f96151f899ed', '1c320217532fb6a3', '2c0138a050a71cac',
        'a81a3bd08ade790c', '76fb50bf5b151f0b', '366eda4729af6993', '5a9fe1f53f18b719'
      ],
      'killer/easy': [
        'd6d24658ac43741c', 'ca11e89738530113', 'fc5987d3359e322f', '12136217e152a1c3',
        '25e74325e6e0ea81', 'cea6bef9a027c705', 'd27180698b69529d', '68f779bbcaf4402f',
        '55f62248505d05bc', '9e9192547b6657b0', '51237117bbf41cf3', 'ecd20b3c95e6d868',
        '6fff0e587b50e82c', 'ce2cd917ee6a7103', 'c865478d26ce52e9', 'cf860f56b3fbfba2',
        '880e715401c53dc0', '3a911c65016453e1', '3cf6be83fa01d427', '160f6c20731add2c'
      ],
      'killer/hard': [
        '3ebeef31b34a35cd', '6ba5d6665fa90f42', 'c48225dfed2eccdb', 'f29839e4029eb9c8',
        '45e0878d343f0811', '25197193440b59df', '910dd7a96f77fe35', '79aeeefba7f3d077',
        'f14aa3dd1d534b01', '6acbbdd97936928d', '3f4c9bcd90045409', '8125d02969965045',
        '794786d964786925', '9fab0bacd7a2fee8', '4a4d846cb5e91dd0', 'e4a84af6314fd34a',
        'bfefdca26b175dd6', 'd8b8902d49afc401', '744737bca394c788', '47d25178effcb3a4'
      ],
      'greaterThan/normal': [
        '0b9e0a0967037cd5', 'fe5ad79967319c8d', '6f6fe3b6940cba62', 'bb4f2fb157042f5d',
        'd868bdfcb80befd0', 'd75d790e66c3706a', 'bb06ca80cd4622cc', '691d7154cd3269c8',
        'b1a7d96720db4533', '5f337e221220ad06', '0e1dca57df81892b', '88d8fb14597a40b0',
        'cf2cd98ae04a6066', '6ec071e025ab0534', '0ca6210c0d2f5ba8', '035b921574918611',
        'ba70cb4ba7597237', 'bed41ef541cfc591', '6ad3b7bfb2fbd6c3', '4da5352455492bb0'
      ],
      'greaterThan/hard': [
        '9824f413eed441d7', 'bd35f3a2985656c6', 'ee05692893689fb4', 'a2d0a30eed29bfaa',
        'fbca2786f61942ea', '4d142fcd38954011', '63aae3bbde5b31b7', 'b73d900f7ca9198b',
        '3268fd0e36b4a7e2', '7ff7ff078c0d13e3', '5a5d8c2137663775', 'bb422294eda15ca0',
        'f037c7857c5ed171', '2ca82883e5269f57', '48e83fe1be265cbd', '2028c0b8a8b8465c',
        '0b2801e974fd1ecd', '95d2e231ac881b7d', '6cb0d2587d741b64', 'ce03c09a3f922a86'
      ],
      'samurai/easy': [
        'f96c08e07851e634', '700389dcd261dfc8', '14824151f0eab8bd', 'b2edd3987da9a98c',
        '7d34145019b7ac24', 'a51135bd5ae679c1', '6884c5e08ca17884', 'b1368629a79b39a5',
        '523df76d67685d01', 'b0c0d49b868f03c7', 'ebf2becb52c91c17', '99a3f9ba66b26526',
        'f2adfd56a15e61aa', '1243006083b9fbd4', '36644920ccde7f24', '84d8a042169638de',
        '957046eee4d64972', '3dbccc48460dd0ec', 'f4a6bcf48c804820', '9f0823973502869b'
      ],
      'sohei/veryEasy': [
        'a0b73b38900c816c', '1f9632340b3289b0', '2d1421dfc3fd477b', 'b232e83338e13cc7',
        '6bb27729406ed46d', 'ef0dd7cdf30c2179', '02ef82980a0d56fc', '95cdfe67491a0fd3',
        '85e79e4572f1a3f1', 'f7b23bd86c4e0a8c', '19434e6df9b68c69', 'c62bda95e241daf1',
        '07550a1e621f5682', 'df82d5a102579495', '8f489f862f61874a', '3b1caccba1d276df',
        'b83d163c35a2db28', '60f3a0f33b123ad7', '4dbb4d036c950357', 'c3ef4a82a5063d7e'
      ],
      'butterfly/normal': [
        '6607059829e6df7c', 'ecc8408ffc38342b', '86661d87ace8ce83', '69efd16ff1dd2d8b',
        'e2b2ef27f1471243', 'b45089011ed8de0d', '3ba9f2026059a496', '9cc84cb3b0d9c977',
        'e02a01fd4779fdf1', 'cafe3f2c51fec6e8', '32cab496bb53e0c2', '62748f556d263759',
        '83ad03391a2817d5', '477255b88169272c', '63ba0bb96373c3e5', '62fe0b1e25b256ba',
        '81465f298bc85355', '9459705a72605f4e', '86b1fe9677d0ab12', 'b4764a9ccfdb6fd8'
      ],
      'flower/normal': [
        'e97b2c5a309e5976', 'ed93d8fd938119a1', '621451872de5c3c3', 'd364ecda6bb3c8b6',
        'a70fe9cfd56db29b', '0259a9932665a8c7', 'db8e880904819e25', 'e268bb8fdf8bae5b',
        'fcb6ad2fb40c741b', '655322ea9df41c06', '1852a5b4f107ab90', '50cccfec506e1678',
        '08a95f9347524857', 'e9cfaba77d3d95c3', '039353de203380e2', '30012b41b0b5429d',
        '813616770a99fba3', '338b95d9e6741be5', '95d5de7fb560f24b', '82b606b916644655'
      ],
      'wordoku/normal': [
        '770b3972de3baa66', '84c18ad36aa77cf7', '9268e86a2fa8fe66', 'b89cea4224cd5526',
        '847f3093c15d8fc7', '82f6525fa7f0974b', '13c404cb2d2927c7', 'fece246665d97f82',
        'ae8755effe00e4ab', '1b02bbfe3821a58a', 'c5bc5f5b181d99bf', '796cb18ce3db12e0',
        'e3ceb1478406184b', 'f2d98b4c08c11c48', '2fd9425d002699c1', '27f43e542e1e6e60',
        '9bd86cc4381884b0', '9acdf3ec4b782cb0', '9881e4742566e8b8', 'abfe29d6eddcbe9a'
      ]
    }
  };
})();
