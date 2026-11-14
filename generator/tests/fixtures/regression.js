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
        '0be384c7147fa983', 'ebf80364c8038d30', 'deebe99ca53c1b08', '16699f94c0182fc0',
        'f04dcdb2a7033d2e', '0417bf9be8da844f', '3934a44d0a2ebb31', 'cd513778283eb8bc',
        '41782667eea6f043', '704b503d56ad1e41', 'b8f358daf51c2836', '33ef8b3c6916a3a8',
        '1e1ea32b2c78521f', 'cdb9503c2befa2a8', '1f3b5c169454b6ca', '86176e23cf286857',
        '15e21332252d6f6e', '0be944fd5d3fe141', 'd7355e2086317a44', '082d399365587347'
      ],
      'classic9/veryEasy': [
        'b69ed95547eb4f09', '5fff9ba28713275e', '8c0e84aa5609f656', '54f5331c2b6491e0',
        'f48626d223c29afe', '0f9ba7a745f98063', 'd5e9b1f92f079e25', 'b09bcc6d7460b631',
        '2649061483eced78', '72865cb6c633457a', 'cceff5adb44f0021', 'c6aa405ccfee8280',
        'cbe34a75d8407079', '79aea134907ba578', '26d4792cee9c4670', 'cad2d96526214659',
        'd763b71e39a8e842', '34def9b0aad43b7c', '84a0fb3b1f761def', '0ddd320e8abd7072'
      ],
      'classic9/easy': [
        'f13dafc7eb9b47c3', 'c48cdb30a2a694ac', 'c1f0fd63fe3f73c7', '2c0b5c6c3a821bf0',
        '2f596729e6d3a325', 'fc0995d0d9374fec', 'bbacee62d5a81fce', 'bf89a2b6caf77e1a',
        '5fdcad385fc3ac04', 'a8ed11845212cc68', 'c8e2457ecd3602a2', 'c5a71fae38bc99d2',
        'b7802c520e72e3fe', 'c439920c7e01d2d0', '3865e7e9a3e498d5', '2c65f22aeb883086',
        '89b52757515f80a3', 'cdafa4e21cb63f1e', 'a6084cccb0ead5d0', '38c28c06ab4590ea'
      ],
      'classic9/normal': [
        '643c9fdcc775c3a0', 'e0d7048ab913bf86', 'eeef3f6077a69a4c', 'd33e53a7f63629a3',
        '5a7ac7a01edc6bec', '02274b8f8570a9db', 'ef28fdca396a4496', 'fec22b176a036943',
        '344f5121108da81d', '36d8675075c3c7fc', 'fc2a91bd85977a61', '76c1a22ec8217a02',
        '2179010bc7bb4d1f', 'e3d6a5dd7b803ac1', '2eece18b3a87671f', '62032a6281b0860e',
        '2c954e8784927b33', 'e1f6061474401c98', '1f9b7aa5ee1db7b9', 'a451447f751e433b'
      ],
      'classic9/hard': [
        '40fdd3618f9fe1cd', '5211afb6f6e0578a', '7a9837af6ccfc94b', 'dce72ce6a0b55cea',
        '9e25846c604913e0', '51a6803b75dd9b5f', '1d9d0db3abde4727', '0a8eae8c3c4e9150',
        '4ab209252b7471d9', 'b0bfcec37b2e2097', 'fb1e5811a4a5944d', '7756b11cb6f69b30',
        'e7567ff551ba0839', '22f45f00991aa3cc', '8685946bc9f9a7cf', '7294b065e03e5c39',
        'ef9df99430eb60c8', '016c748ccb43ed70', '25e8f2abf906d05f', 'b277386afa20f9b6'
      ],
      'classic9/expert': [
        'cf5f01b2e3df218e', '63335b832060f687', 'c9d05e1ca3693320', 'bd4993516e41b57d',
        'dfc2f27edb889022', '98678781ced00fad', '5644f604055dd378', 'caa0a7c05c66196c',
        '1e929e1c39e52ed0', '2b24125181b5be0d', '8d70a6b459b91bc8', '063cef13bd709f07',
        '4b51ce6e557d7ea2', '1946e002586f9e2e', 'eb9d53fe3bc946e2', '608b89563e6deaea',
        '9b72e4ea0444d336', '18983241bdd625ed', 'd230944fcb0b146b', 'a28b5b45d94744a9'
      ],
      'classic9/master': [
        'fc57f60c46e6a160', '1e7617daded7a8a6', 'c5c40c759a90c159', '17cddcbb7eedde6f',
        '9acc42c4df5edcf8', '13b7c1c9afb3c8a5', '6d8d36b696971cba', 'c4261f0e59b00482',
        'e2b21c3a51c55c76', 'bd213c43c2304327', 'c2fe5916460d3b1a', '7a8772b5bd21f6e9',
        'be649dadb4eb4fd1', '07d3208b6482b68f', 'a1e70ea13ee80f3d', '48d01644a2a61318',
        '40fb1b94a17744c8', '5b90d5565d7fb11a', '29347bf7614c9de3', '0653c5d7dc8f5133'
      ],
      'classic9/nightmare': [
        '86d1e172be618b9e', '7c21f405e81ddad9', '014f55fe64c7b982', '486e7c2ec5568382',
        '345c0e526057fe6e', '12ef6c318fc0d53d', 'b1f7b262d7cb10ce', 'e6a777410136194d',
        '4164e7fe5f7fe0e2', '85547b3b71a3ee0f', '0caa79518030700d', '5b51d9e075f3fe7c',
        'b457b0449e9a0ee8', '71afbd6714c77a53', 'd21fee25b9491269', '1e3ed1b29371764e',
        '41ea89e94ebb3c95', '333527f37c599ca7', '6609cbc059d1792c', '7e5d71552b14f449'
      ],
      'mega12/normal': [
        '97897abcb3ad1978', '880378cbd0717e4f', '8db24fe4df2928a0', 'f7a01ff67ea68312',
        '9e98557b55b73817', 'bceb966210506f66', '1fd8b15b09114577', '52525aed259d8531',
        '425d6f45533a1781', 'ff0930f2fb12ca3e', 'ecd8bfc5dcb94cf9', '6232cbc9ca4931bd',
        'e17baeb9ba36830d', '6712ad085f3d73dc', '460aa705440e6769', '2ac84aa1f2b544dd',
        'b690724544e18d81', 'f65c13467942dc0a', 'ff5b4405f61ad259', '02d858c78647c28b'
      ],
      'mega16/easy': [
        '1213daa9241eb755', 'f17b3972b5078be6', 'fc5b478d924ead49', '2c105509e5b5df75',
        'b09a26da9b2f3c86', 'f777c5251cc36899', '2e014f049dc3bd10', '315950aeb4966b72',
        'bb3eae48acfe4f1c', 'f785d1caa546c7b6', 'b06682987398d3ec', 'e7a325fc8f0e12a0',
        '09d458188f85d904', '8d61b25e0438a6da', 'cadf5bc2518e6b2e', '0a3e5a0a160996fe',
        '7815271420b2d6d0', '36a08aabc4a1278f', '3b6475c95eb7cda5', '9980015af8ba472e'
      ],
      'diagonalX/easy': [
        '9c8e49f05ea7285c', 'b3d6628e39c5c302', '825ad7840cbd1898', 'ed2fd97eda3a5b52',
        'ca3467193eb70335', '4fc5878d57bebaf1', '5062e511d91b361d', 'b8fa35efceb9ed4b',
        '3369c38bed0e84ef', 'afa27c106add2eac', 'a4a739ace99ed790', '5864997927d7ac75',
        '07436df731180c13', '13f62fa2978df49e', '3cb099b3595569d7', '18c13b85be101b29',
        '69ce6a82fd52539e', 'e9142c88dff360d4', 'd5f4aeb7c4373de3', '21d0e09cd4e738d0'
      ],
      'diagonalX/nightmare': [
        '2d590e59df31f175', 'e146de8f5fc95aeb', 'edfaf735dcebeb69', '36a7770b4c58994f',
        '30a81f93a7eab1f7', '863dc6f9375bbf65', '1f1a13a4b5e716e8', 'd3b88366b7c46bea',
        'c569190b688625cf', '2664a77a0835c0e6', '37f4fcd45964d318', '0086fe024b32105e',
        'a7dd044fac63df4b', 'eab7817ac72f1b96', 'd560e6c98ee86185', 'd74675d99db28fa5',
        'c2a515b84ef8b804', '5410290818e10de4', '0b042686411f1b3a', '4d80a44cf03bb140'
      ],
      'hyper/hard': [
        '8cb8dd03560df7d7', 'bc3d5e35d5c2eaf9', 'b2f1ed93f656de47', 'b814c3c13a732ded',
        '1dde4e9d56c968a1', '731324bc439c8ec0', '311f4cc60de8213a', '0d0d900edf8de852',
        '80b5ed097bc24345', '4c0e5a9a9d05a2d6', 'f74c25726f17805e', '5c4451eab2778e46',
        '21528e4cf2bfde80', 'fb5bfcc81e101284', '2c09a432d0ecf77e', '0fda20545d1d85f8',
        'd3d4cd0bba56df2f', '7a89449a7dd91316', 'b5407a1771d50303', '5a740a58f4fea224'
      ],
      'jigsaw9/normal': [
        '2c4d9f7b5163597f', 'bfdd28db6b1108ef', '6e3f276349ae5557', '5fdb990b0a55114f',
        '5cece083ad6917d7', '5191bc2b20f4459f', '99f875861f5431ea', '379c679d77e25c21',
        'e9bd4be186bef15d', 'de8e0f60d17b0e0c', '6101aba1cdef118d', '7238027967442e45',
        'a503ec29aed16c35', '55bbc11b89197faf', 'ac82ffd4783b28e8', '9f7fc1c2cd0fba9e',
        '75897d415d35867d', 'f9c28b39778a6835', '58758a2c4fce9f80', 'f4fcec5137967c1d'
      ],
      'jigsaw9/master': [
        '1c5c5ed58c309ae9', '9aa45cd70525e113', 'e90a0e8819560f34', 'e059108b7a7ccdcf',
        '36f632c85a64c564', '16b7769b1f5ac88f', '693948643a17b428', 'f1c4492af2f3daa6',
        'd839f0d99a9f9b55', '5ee4751c026ba7e0', '038769e29d8b484e', '1f33856b569e669f',
        '73c507594a734845', 'e084be58d1539d74', '1c320217532fb6a3', '69d939da07d1b9f6',
        'abce69b204215f3e', 'f85026d6fd76e96a', '107a7dec7586aae0', 'a7800211c3d4df8d'
      ],
      'killer/easy': [
        'da1eebf5af0b0cb9', 'e02d325e6f5a2f02', '8e5621f702060fcb', 'a4fd2fa9ebcce985',
        '18196497692a7ba3', 'be9f0de6e071df4a', '8bca1b8647f11342', 'eaab31fd8f0c0721',
        'a37b93d7d6c55b33', '6a06cf7f42b0a3e3', 'c1e8ff4820d8f22c', 'faa7538f4026331b',
        '27f7248d703ea899', '7f9b9fc00f290284', '4430084f3ea5e7b3', 'cda500b8c27e15c4',
        '417d5494b4dbbcb0', 'f0f6ed371611452b', 'f6e936b8b44c019c', '49b1d4fc260b3810'
      ],
      'killer/hard': [
        '3ebeef31b34a35cd', '6ba5d6665fa90f42', 'c48225dfed2eccdb', 'f29839e4029eb9c8',
        '45e0878d343f0811', '25197193440b59df', '910dd7a96f77fe35', '79aeeefba7f3d077',
        '6bdea7abf96ae5f7', '6acbbdd97936928d', '3f4c9bcd90045409', '8125d02969965045',
        'aba201f7e7b2ffcb', '9fab0bacd7a2fee8', '0e4c9ada552b858e', 'e4a84af6314fd34a',
        'bfefdca26b175dd6', '30fde1e1bc69becd', '744737bca394c788', '47d25178effcb3a4'
      ],
      'greaterThan/normal': [
        '451f70324dc8cfde', '6178ebe3355d8de7', 'fdf616f1a201e4c5', 'bb4f2fb157042f5d',
        'd868bdfcb80befd0', 'e630c501243b17fd', 'e78928dd159a09b9', '1da2078420403d18',
        'acd99944b1398b68', '9d2dfcc72897d34b', 'abdc4f8d5d4d49b1', '505b2a4e5b1e9a72',
        'cf2cd98ae04a6066', '28c2ea302da80774', '474ecaf811fb58e4', '3687cb45ac207381',
        '30ebd95ebcc28622', '6b17f75973826cf5', '5dddb768e0d111d4', 'f4ec96f5f0d71eb1'
      ],
      'greaterThan/hard': [
        '57723d97f39afc43', 'bd35f3a2985656c6', 'ee05692893689fb4', 'a2d0a30eed29bfaa',
        'fbca2786f61942ea', '4d142fcd38954011', '63aae3bbde5b31b7', 'f69446227ecf603e',
        '3268fd0e36b4a7e2', '7ff7ff078c0d13e3', '5a5d8c2137663775', 'bb422294eda15ca0',
        'f037c7857c5ed171', '2ca82883e5269f57', '48e83fe1be265cbd', '2028c0b8a8b8465c',
        '0b2801e974fd1ecd', '95d2e231ac881b7d', '6cb0d2587d741b64', 'ce03c09a3f922a86'
      ],
      'samurai/easy': [
        'f96c08e07851e634', '29ea510982b8b605', 'e24a3783fba0d16f', 'a6601c579efce54b',
        '7d34145019b7ac24', '1c56198290a5dc1e', '6884c5e08ca17884', '3d4bf69d87e8da41',
        '523df76d67685d01', 'b0c0d49b868f03c7', 'ebf2becb52c91c17', 'b13e2b24692b1260',
        '6474c0651399c159', '54dd5532a2eb258e', '36644920ccde7f24', 'f476d1e95733e335',
        '957046eee4d64972', '3dbccc48460dd0ec', 'f4a6bcf48c804820', 'ec0517d97ac2dbb5'
      ],
      'sohei/veryEasy': [
        'a0b73b38900c816c', '1f9632340b3289b0', '2d1421dfc3fd477b', 'b232e83338e13cc7',
        '6bb27729406ed46d', 'ef0dd7cdf30c2179', '02ef82980a0d56fc', '95cdfe67491a0fd3',
        '85e79e4572f1a3f1', 'f7b23bd86c4e0a8c', '19434e6df9b68c69', 'c62bda95e241daf1',
        '07550a1e621f5682', 'df82d5a102579495', '8f489f862f61874a', '3b1caccba1d276df',
        'b83d163c35a2db28', '60f3a0f33b123ad7', '4dbb4d036c950357', 'c3ef4a82a5063d7e'
      ],
      'butterfly/normal': [
        'd90cdd3552337f59', '7a94e011a87fdc5d', 'a968f74fca20834b', '69efd16ff1dd2d8b',
        '906a5592a83a0d36', 'b45089011ed8de0d', '3ba9f2026059a496', '3c2344ed83a6fb51',
        '5952f46a00628fde', 'a91195c46f34c300', '6d3d197dddd10e11', '6abd8b19b72a3e35',
        '5b5c80220693f996', '4cb84b28fd608b3c', '06fd8974a3e39bb0', '1bf06aee594aaaca',
        '81465f298bc85355', '2726b974691b9950', '09bc863295882686', '30c22595f31fc269'
      ],
      'flower/normal': [
        '29a1ca2796eb3c73', '71f71e28281a0bbc', '0a7de5eb063a148f', 'a2184c82f74fdb3e',
        '3d2c0b66ff7ae11a', 'a5c4ed87e8936ed3', '1ff85c5f07fbd8db', 'eb6fbf557bafcbc9',
        '383a5fe938e475a5', '90c3c8866706070a', '7177d52ac3569496', '50cccfec506e1678',
        '636b4127f4d6f523', 'e9cfaba77d3d95c3', '039353de203380e2', '21a8bd7c9608a558',
        '3820f5bd7b062201', '338b95d9e6741be5', '95d5de7fb560f24b', 'db8a67f2b521764e'
      ],
      'wordoku/normal': [
        '106d019f85ac4e3b', '84c18ad36aa77cf7', 'b759edc0722cbfe4', 'cdb6125093a657cc',
        '3749ae2311557287', 'e5e9ffb1f77da01d', '13c404cb2d2927c7', 'fece246665d97f82',
        'ae8755effe00e4ab', 'e8bd112ddf6387e1', 'c5bc5f5b181d99bf', '796cb18ce3db12e0',
        '53105a2fdb847f13', '9af316182f69aa0c', '0a64915ebe8dac5a', '48d651654af67b51',
        '9bd86cc4381884b0', '9acdf3ec4b782cb0', '9881e4742566e8b8', 'a779152d916fb241'
      ]
    }
  };
})();
