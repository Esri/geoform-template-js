define([], function (){
  $( document ).ready(function() {
    var $tabs = $('.tab-links li');
    $('.prevtab').on('click', function() {
      $tabs.filter('.active').prev('li').find('a[data-toggle="tab"]').tab('show');
    });
    $('.nexttab').on('click', function() {
      $tabs.filter('.active').next('li').find('a[data-toggle="tab"]').tab('show');
    });
  });
});